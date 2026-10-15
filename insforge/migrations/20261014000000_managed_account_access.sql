-- Application-level account suspension and administrator-only account management.
-- Apply after 20261013234500_roles_and_audit_rls.sql.

ALTER TABLE public.app_user_roles
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.assign_default_app_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.app_user_roles (user_id, role, active)
  VALUES (NEW.id, 'Técnico de red', false)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT role
  FROM public.app_user_roles
  WHERE user_id = auth.uid()
    AND active = true
$$;

CREATE OR REPLACE FUNCTION public.list_app_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  role text,
  active boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
BEGIN
  IF public.current_app_role() IS DISTINCT FROM 'Administrador' THEN
    RAISE EXCEPTION 'Se requiere el rol Administrador para listar las cuentas'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT roles.user_id, users.email, roles.role, roles.active
  FROM public.app_user_roles AS roles
  JOIN auth.users AS users ON users.id = roles.user_id
  ORDER BY users.email;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_app_user_active(p_user_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  affected_rows integer;
BEGIN
  IF public.current_app_role() IS DISTINCT FROM 'Administrador' THEN
    RAISE EXCEPTION 'Se requiere el rol Administrador para modificar el acceso'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR p_active IS NULL THEN
    RAISE EXCEPTION 'La cuenta y el estado de acceso son obligatorios'
      USING ERRCODE = '22004';
  END IF;

  IF p_user_id = auth.uid() AND NOT p_active THEN
    RAISE EXCEPTION 'No puedes desactivar tu propia cuenta'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.app_user_roles AS roles
  SET active = p_active
  WHERE roles.user_id = p_user_id;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows = 0 THEN
    RAISE EXCEPTION 'No se encontró la cuenta indicada'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.list_app_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_app_user_active(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_app_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_app_user_active(uuid, boolean) TO authenticated;
