-- Administrator-only account role changes and protection for the last active administrator.
-- Apply after 20261014000000_managed_account_access.sql.

CREATE OR REPLACE FUNCTION public.set_app_user_active(p_user_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_role text;
  target_active boolean;
BEGIN
  IF public.current_app_role() IS DISTINCT FROM 'Administrador' THEN
    RAISE EXCEPTION 'Se requiere el rol Administrador para modificar el acceso'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR p_active IS NULL THEN
    RAISE EXCEPTION 'La cuenta y el estado de acceso son obligatorios'
      USING ERRCODE = '22004';
  END IF;

  LOCK TABLE public.app_user_roles IN EXCLUSIVE MODE;

  IF public.current_app_role() IS DISTINCT FROM 'Administrador' THEN
    RAISE EXCEPTION 'Se requiere el rol Administrador para modificar el acceso'
      USING ERRCODE = '42501';
  END IF;

  SELECT role, active
  INTO target_role, target_active
  FROM public.app_user_roles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la cuenta indicada'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_user_id = auth.uid() AND NOT p_active THEN
    RAISE EXCEPTION 'No puedes desactivar tu propia cuenta'
      USING ERRCODE = '42501';
  END IF;

  IF target_role = 'Administrador'
     AND target_active
     AND NOT p_active
     AND (
       SELECT count(*)
       FROM public.app_user_roles
       WHERE role = 'Administrador' AND active = true
     ) <= 1 THEN
    RAISE EXCEPTION 'No se puede desactivar al último administrador activo'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.app_user_roles
  SET active = p_active
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_app_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_role text;
  target_active boolean;
BEGIN
  IF public.current_app_role() IS DISTINCT FROM 'Administrador' THEN
    RAISE EXCEPTION 'Se requiere el rol Administrador para cambiar roles'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR p_role IS NULL
     OR p_role NOT IN ('Administrador', 'Técnico de red') THEN
    RAISE EXCEPTION 'La cuenta y un rol válido son obligatorios'
      USING ERRCODE = '22023';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol'
      USING ERRCODE = '42501';
  END IF;

  LOCK TABLE public.app_user_roles IN EXCLUSIVE MODE;

  IF public.current_app_role() IS DISTINCT FROM 'Administrador' THEN
    RAISE EXCEPTION 'Se requiere el rol Administrador para cambiar roles'
      USING ERRCODE = '42501';
  END IF;

  SELECT role, active
  INTO target_role, target_active
  FROM public.app_user_roles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la cuenta indicada'
      USING ERRCODE = 'P0002';
  END IF;

  IF target_role = 'Administrador'
     AND target_active
     AND p_role = 'Técnico de red'
     AND (
       SELECT count(*)
       FROM public.app_user_roles
       WHERE role = 'Administrador' AND active = true
     ) <= 1 THEN
    RAISE EXCEPTION 'No se puede quitar el rol al último administrador activo'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.app_user_roles
  SET role = p_role
  WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_app_user_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_app_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_app_user_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_app_user_role(uuid, text) TO authenticated;
