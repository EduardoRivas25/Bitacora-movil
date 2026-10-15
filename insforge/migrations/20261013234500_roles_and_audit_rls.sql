-- Server-enforced role assignments and an append-only application audit log.
-- Apply after reviewing the existing InsForge policies and promoting the
-- intended administrators in app_user_roles using a privileged SQL session.

CREATE TABLE IF NOT EXISTS public.app_user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Administrador', 'Técnico de red')),
  assigned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_user_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.app_user_roles TO authenticated;

DO $$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_user_roles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.app_user_roles', existing_policy.policyname);
  END LOOP;
END;
$$;

CREATE POLICY app_user_roles_read_own
  ON public.app_user_roles
  FOR SELECT  
  TO authenticated
  USING (user_id = auth.uid());

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
$$;

REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;

-- Existing accounts receive the least-privileged role. Promote administrators
-- explicitly with a privileged SQL session before releasing the app.
INSERT INTO public.app_user_roles (user_id, role)
SELECT id, 'Técnico de red'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Keep a reliable relationship for maintenance records created from inventory.
ALTER TABLE public.maintenances
  ADD COLUMN IF NOT EXISTS device_id uuid
  REFERENCES public.devices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS maintenances_device_id_idx
  ON public.maintenances (device_id);

CREATE OR REPLACE FUNCTION public.assign_default_app_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.app_user_roles (user_id, role)
  VALUES (NEW.id, 'Técnico de red')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_default_app_role() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS assign_default_app_role_after_signup ON auth.users;
CREATE TRIGGER assign_default_app_role_after_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_app_role();

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  record_id text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  actor_role text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  old_data jsonb,
  new_data jsonb
);

CREATE INDEX IF NOT EXISTS audit_logs_changed_at_idx
  ON public.audit_logs (changed_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_table_record_idx
  ON public.audit_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx
  ON public.audit_logs (actor_id, changed_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

DO $$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.audit_logs', existing_policy.policyname);
  END LOOP;
END;
$$;

CREATE POLICY audit_logs_admin_read
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.current_app_role() = 'Administrador');

CREATE OR REPLACE FUNCTION public.capture_app_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_mail text;
  row_data jsonb;
  safe_data jsonb;
  previous_data jsonb;
  next_data jsonb;
  record_key text;
BEGIN
  IF actor IS NOT NULL THEN
    SELECT email INTO actor_mail FROM auth.users WHERE id = actor;
  END IF;

  IF TG_OP = 'INSERT' THEN
    row_data := to_jsonb(NEW);
    safe_data := row_data - ARRAY['content', 'password', 'password_hash', 'token', 'secret', 'api_key', 'private_key'];
    next_data := safe_data;
    record_key := row_data ->> 'id';
  ELSIF TG_OP = 'UPDATE' THEN
    row_data := to_jsonb(OLD);
    previous_data := row_data - ARRAY['content', 'password', 'password_hash', 'token', 'secret', 'api_key', 'private_key'];
    row_data := to_jsonb(NEW);
    safe_data := row_data - ARRAY['content', 'password', 'password_hash', 'token', 'secret', 'api_key', 'private_key'];
    next_data := safe_data;
    record_key := row_data ->> 'id';
  ELSE
    row_data := to_jsonb(OLD);
    previous_data := row_data - ARRAY['content', 'password', 'password_hash', 'token', 'secret', 'api_key', 'private_key'];
    record_key := row_data ->> 'id';
  END IF;

  INSERT INTO public.audit_logs (
    table_name, record_id, operation, actor_id, actor_email, actor_role,
    old_data, new_data
  )
  VALUES (
    TG_TABLE_NAME,
    COALESCE(record_key, 'unknown'),
    TG_OP,
    actor,
    actor_mail,
    public.current_app_role(),
    previous_data,
    next_data
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_app_audit_log() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  app_table text;
  existing_policy record;
  write_roles text;
BEGIN
  FOREACH app_table IN ARRAY ARRAY[
    'networks', 'subnets', 'buildings', 'departments', 'devices',
    'incidents', 'maintenances', 'device_configs', 'switch_ports'
  ]
  LOOP
    IF to_regclass(format('public.%I', app_table)) IS NULL THEN
      RAISE EXCEPTION 'Required InsForge application table public.% does not exist', app_table;
    END IF;

    -- Replace the table's existing policies so a permissive policy cannot
    -- override the role matrix below.
    FOR existing_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = app_table
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', existing_policy.policyname, app_table);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', app_table);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon', app_table);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', app_table);

    EXECUTE format(
      'CREATE POLICY app_select ON public.%I FOR SELECT TO authenticated USING (public.current_app_role() IN (''Administrador'', ''Técnico de red''))',
      app_table
    );

    IF app_table = ANY(ARRAY['networks', 'subnets', 'devices', 'incidents']) THEN
      write_roles := '''Administrador'', ''Técnico de red''';
    ELSE
      write_roles := '''Administrador''';
    END IF;

    EXECUTE format(
      'CREATE POLICY app_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.current_app_role() IN (%s))',
      app_table, write_roles
    );
    EXECUTE format(
      'CREATE POLICY app_update ON public.%I FOR UPDATE TO authenticated USING (public.current_app_role() IN (%s)) WITH CHECK (public.current_app_role() IN (%s))',
      app_table, write_roles, write_roles
    );
    EXECUTE format(
      'CREATE POLICY app_delete ON public.%I FOR DELETE TO authenticated USING (public.current_app_role() = ''Administrador'')',
      app_table
    );

    EXECUTE format(
      'DROP TRIGGER IF EXISTS capture_app_audit_log ON public.%I',
      app_table
    );
    EXECUTE format(
      'CREATE TRIGGER capture_app_audit_log AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_app_audit_log()',
      app_table
    );
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS capture_app_audit_log ON public.app_user_roles;
CREATE TRIGGER capture_app_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.app_user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_app_audit_log();
