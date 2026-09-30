# Migración de Supabase a InsForge

## Estado

- Proyecto InsForge enlazado: `Bitacora-red` (`a7eb2c91-6f7b-4569-9ad3-4d07f49b622d`).
- Las nueve tablas del esquema adjunto se crearon con la migración `20260930202035_migrate-supabase-schema.sql`.
- Las nueve tablas de InsForge están vacías. La aplicación ya usa InsForge para datos y autenticación.
- Google y GitHub inician OAuth con InsForge; las URL de retorno locales y de la app móvil están permitidas. El flujo completo requiere probar una cuenta real en web y en una compilación móvil con el esquema `bitacoraredes`.
- El SDK de InsForge está instalado y el cliente se encuentra en `src/lib/insforgeClient.ts`.

## Datos necesarios del origen

El adjunto describe columnas y políticas, pero no contiene filas ni usuarios. Para completar la migración hace falta un respaldo de Supabase que incluya:

1. Las filas de `networks`, `subnets`, `buildings`, `departments`, `devices`, `incidents`, `maintenances`, `device_configs` y `recent_activities`, con los UUID y fechas originales.
2. Las cuentas de `auth.users` o un procedimiento acordado para que los usuarios creen nuevas contraseñas en InsForge. Los hashes de contraseña y sesiones de Supabase no se deben copiar sin confirmar compatibilidad; los usuarios OAuth deberán volver a iniciar sesión.
3. Cualquier archivo externo referenciado por `device_configs.file_url`, si existe. El código actual guarda el contenido de la configuración en la base de datos y no usa Supabase Storage directamente.

No incluir claves de servicio en el repositorio. Las credenciales administrativas se usan solo en un entorno privado de importación.

## Orden de importación

1. Cuentas de usuario, si se van a conservar o mapear sus identificadores.
2. `networks`, `buildings`, `maintenances`, `recent_activities`.
3. `subnets`, `departments`.
4. `devices`.
5. `incidents`, `device_configs`.

Después de importar, comparar el número de filas por tabla y comprobar relaciones, registros clave y permisos con una cuenta autenticada. La app ya apunta a InsForge, por lo que los registros anteriores no aparecerán hasta completar esta importación.

## Diferencia deliberada de permisos

El esquema adjunto permite a usuarios no autenticados insertar, editar y eliminar `buildings` y `departments`. La app exige iniciar sesión, así que la migración de InsForge restringe las nueve tablas al rol `authenticated`. Confirmar esta regla antes de exponer un flujo público.

## Autenticación de la app

InsForge exige verificar el correo mediante código en la configuración actual. La app ya incluye registro, verificación por código, inicio de sesión, recuperación de sesión en móvil y OAuth con Google/GitHub. Las sesiones existentes de Supabase no se trasladan automáticamente. OAuth móvil requiere una compilación de desarrollo o producción que registre el esquema `bitacoraredes`; Expo Go no registra ese esquema propio.
