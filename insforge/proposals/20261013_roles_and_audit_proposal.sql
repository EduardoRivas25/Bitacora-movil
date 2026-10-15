/*
PROPUESTA PARA REVISION DEL EQUIPO INSFORGE
NO EJECUTAR: faltan confirmar el esquema real de las tablas y dónde se almacena
el perfil/rol en auth. El archivo es deliberadamente un comentario SQL.

Matriz acordada para la interfaz:
- Ambos roles: SELECT de la información autorizada por la política general.
- Técnico de red: INSERT/UPDATE en devices, networks, subnets e incidents.
- Técnico de red: sin DELETE; sin cambios en buildings, departments, maintenances,
  device_configs, switch_ports ni administración de cuentas.
- Administrador: acceso de lectura/escritura a las tablas de la aplicación,
  incluidos DELETE y cambios de mantenimiento/configuración/edificios/puertos.
- Los roles desconocidos o no asignados no reciben permisos de escritura.

Requisito: implementar la misma matriz en RLS de cada tabla. Los controles de la
app son solo presentación y se pueden omitir; no sustituyen la autorización del
servidor. No activar escrituras hasta que las políticas RLS se hayan probado con
cuentas de ambos roles.

1. HISTORIAL DE CAMBIOS (borrador; revisar nombres y tipos antes de aplicar)

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  old_data jsonb,
  new_data jsonb
);

CREATE INDEX audit_logs_changed_at_idx
  ON public.audit_logs (changed_at DESC);
CREATE INDEX audit_logs_table_record_idx
  ON public.audit_logs (table_name, record_id);
CREATE INDEX audit_logs_actor_idx
  ON public.audit_logs (actor_id, changed_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Leer auditoría solo a administradores; insertar exclusivamente por trigger
-- SECURITY DEFINER; denegar UPDATE/DELETE a los roles de la aplicación.
CREATE POLICY audit_logs_admin_read ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.current_app_role() = 'Administrador');

-- public.current_app_role() es un marcador de posición conceptual. El equipo
-- debe implementarlo usando la fuente de perfil/rol real de InsForge, verificar
-- que el rol sea válido y fijar search_path. No asumir que auth.users tiene una
-- columna profile hasta confirmarlo en el proyecto.

-- Función de trigger propuesta:
--   INSERT: guardar to_jsonb(NEW) como new_data, OLD como NULL.
--   UPDATE: guardar to_jsonb(OLD) y to_jsonb(NEW).
--   DELETE: guardar to_jsonb(OLD) como old_data, NEW como NULL.
--   record_id: COALESCE(NEW.id, OLD.id)::text.
--   actor_id: auth.uid(); actor_role: public.current_app_role().
--   Retornar OLD para DELETE y NEW para INSERT/UPDATE.
--   SECURITY DEFINER, search_path fijo y sin permiso de escritura directa
--   para authenticated en audit_logs.
--
-- Instalar un trigger AFTER INSERT OR UPDATE OR DELETE en las tablas existentes
-- siguientes, omitiendo cualquier tabla que no exista en InsForge:
--   public.networks, public.subnets, public.buildings, public.departments,
--   public.devices, public.incidents, public.maintenances,
--   public.device_configs, public.switch_ports.
-- No conectar el trigger a audit_logs para evitar recursión. Evaluar también
-- exclusión de campos sensibles antes de guardar el JSONB de cada tabla.

2. POLITICAS RLS POR ROL (plantilla conceptual; adaptar una política por tabla)

-- SELECT: conservar/definir la política de lectura que el equipo confirme.
-- INSERT y UPDATE para authenticated:
--   public.current_app_role() IN ('Administrador', 'Técnico de red')
--     en devices, networks, subnets e incidents;
--   public.current_app_role() = 'Administrador'
--     en buildings, departments, maintenances, device_configs y switch_ports.
-- DELETE para authenticated:
--   public.current_app_role() = 'Administrador' en todas las tablas de aplicación.
-- Para UPDATE, aplicar el mismo predicado en USING y WITH CHECK.
-- Revocar cualquier grant/política permisiva existente que contradiga esta matriz.

3. VALIDACION ANTES DE PUBLICAR

-- Probar consultas e intentos de escritura usando una sesión de Técnico:
--   crear/editar dispositivo, red, subred e incidente: permitido;
--   borrar esos registros o cambiar edificios, mantenimiento, backups, puertos:
--   denegado por InsForge, no solo por la interfaz.
-- Probar con una sesión de Administrador las operaciones anteriores y DELETE.
-- Confirmar que cada operación crea un audit_log con actor, operación, tabla,
-- identificador, fecha y datos anterior/nuevo; confirmar que el técnico no puede
-- leer ni modificar el historial.
*/
