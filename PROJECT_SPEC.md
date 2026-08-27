# 📋 Especificaciones y Requerimientos del Proyecto: Bitácora Digital de Redes

Documento de especificación técnica y funcional para desarrolladores y asistentes de IA sobre el alcance, reglas de negocio, modelos de datos, validaciones y criterios de entrega de la aplicación móvil.

---

## 🎯 Objetivo General
Desarrollar en equipos una aplicación móvil multiplataforma que funcione como **bitácora digital** para administrar redes, subredes y dispositivos de una infraestructura de red, garantizando integridad de datos, validaciones estrictas y una experiencia de usuario fluida y moderna.

---

## 🏗️ Stack Tecnológico Seleccionado

- **Framework**: React Native con Expo (SDK 57)
- **Lenguaje**: TypeScript
- **Estilos / UI**: NativeWind (TailwindCSS) / React Native StyleSheet
- **Navegación**: React Navigation v7 (Stack & Bottom Tabs)
- **Persistencia / Backend**: Supabase (PostgreSQL + Auth)
- **Iconografía**: `@expo/vector-icons` (Ionicons)

---

## 🧩 Módulos y Funcionalidades Requeridas

### 1. 🔐 Módulo de Acceso y Autenticación
- **Sin registro público**: La aplicación no requiere registro público abierto.
- **Acceso por credenciales**: Se utilizarán credenciales predefinidas proporcionadas por el docente para realizar las evaluaciones y pruebas.
- **Manejo de Sesión**: Validación de credenciales con Supabase Auth / estado global (`AuthContext`).

---

### 2. 🌐 Módulo de Gestión de Redes y Subredes (CRUD)

Debe permitir la administración completa (Crear, Consultar/Listar, Modificar, Eliminar) tanto para Redes Principales como para Subredes.

#### A. Redes Principales
- **Atributos**:
  - `id`: Identificador único (UUID).
  - `name`: Nombre descriptivo (ej. "Red Administrativa", "Campus Norte").
  - `address`: Dirección IPv4 base (ej. `192.168.1.0`, `10.0.0.0`).
  - `cidr`: Máscara en formato CIDR (entero entre `0` y `32`, ej. `24`, `16`).
  - `description`: Descripción u observaciones opcionales.
  - `created_at` / `updated_at`: Marcas de tiempo.

#### B. Subredes
- **Atributos**:
  - `id`: Identificador único (UUID).
  - `network_id`: Referencia a la red principal padre (Foreign Key).
  - `name`: Nombre descriptivo (ej. "VLAN 10 - Servidores", "Wi-Fi Visitas").
  - `address`: Dirección IPv4 de la subred (ej. `192.168.1.0`, `192.168.1.64`).
  - `cidr`: Máscara CIDR (ej. `26`, `28`).
  - `description`: Descripción u observaciones.

---

### 3. 📱 Módulo de Inventario de Dispositivos (CRUD)

Registro detallado de los equipos conectados a la infraestructura.

#### Atributos del Dispositivo:
1. **Nombre del dispositivo**: (ej. "Switch Core 01", "Impresora RH", "Dev-MacBook-Pro").
2. **Dirección MAC**: Identificador físico en formato estándar `XX:XX:XX:XX:XX:XX`.
3. **Fabricante / Marca**: (ej. "Cisco", "Ubiquiti", "HP", "Apple", "MikroTik").
4. **Ubicación o Edificio**: Lugar físico (ej. "Edificio A - Sala de Servidores", "Piso 2 - Finanzas").
5. **Dirección IPv4 asignada**: Dirección asignada al dispositivo (ej. `192.168.1.15`).
6. **Red / Subred asociada**: Relación directa con la subred a la que pertenece (`subnet_id`).
7. **Descripción / Notas**: Información adicional o rol del equipo.

---

### 4. 🛡️ Reglas de Validación Estrictas

> [!IMPORTANT]
> **No se debe permitir guardar registros con datos inválidos o vacíos.** Toda entrada debe ser validada en el cliente antes de ser enviada al backend.

1. **Validación de Direcciones IPv4**:
   - Formato estándar de 4 octetos: `X.X.X.X` (ej. `192.168.1.1`).
   - Cada octeto debe ser un número entero entre `0` y `255`.
   - No permitir caracteres no numéricos ni octetos fuera de rango (ej. `999.168.1.1` ❌).
2. **Validación de Direcciones MAC**:
   - Formato estricto: `XX:XX:XX:XX:XX:XX`.
   - Exactamente 6 pares de dígitos hexadecimales (`0-9`, `A-F`, `a-f`) separados por dos puntos (`:`).
   - Rechazar formatos sin separador o con separador incorrecto (ej. `AABB.CCDD.EEFF` o `00:1A:2B` ❌).
3. **Validación de Máscara CIDR**:
   - Debe ser un valor entero en el rango `0 <= CIDR <= 32`.
4. **Validación de Jerarquía de Red / Subred**:
   - Una subred debe estar contenida dentro del rango de red principal padre (`subnet.cidr >= network.cidr`).
   - La IP asignada a un dispositivo debe pertenecer al rango válido de su subred asociada.
5. **Campos Obligatorios**:
   - Ningún campo requerido puede quedar vacío ni contener solo espacios en blanco.

---

### 5. 🔍 Módulo de Buscador Global

Buscador ágil y reactivo (con debounce) que permita filtrar el inventario de dispositivos por cualquiera de los siguientes criterios:

- 🔤 **Nombre del dispositivo** (búsqueda parcial / insensible a mayúsculas).
- 🌐 **Dirección IPv4** (búsqueda parcial o exacta).
- 🏷️ **Dirección MAC** (búsqueda parcial o formato completo).
- 🏭 **Fabricante**.
- 📍 **Ubicación o Edificio**.

Cada resultado de búsqueda debe indicar claramente el dispositivo y la **red/subred a la que pertenece**.

---

### 6. 🎨 Requisitos de Interfaz y UX (UI/UX Guidelines)

- **Diseño**: Estilo oscuro profesional (*Dark Theme* inspirado en dashboards de redes/infraestructura: fondos `#000000`/`#1C1C1E`, acentos azul iOS `#0A84FF`, verde `#30D158`, naranja `#FF9F0A`, rojo `#FF453A`).
- **Navegación**: Sencilla e intuitiva con barra inferior (*Bottom Tabs*):
  1. 🏠 **Inicio (Dashboard)**: Métricas principales (Total Redes, Dispositivos, Subredes, Alertas) y actividad reciente.
  2. 🌐 **Redes**: Listado y gestión jerárquica de redes y subredes.
  3. 📱 **Inventario**: Listado general de dispositivos con filtros rápidos.
  4. 🔍 **Buscar**: Buscador interactivo por todos los criterios requeridos.
- **Feedback al usuario**:
  - Mensajes de error claros e informativos en formularios.
  - Modales o diálogos de confirmación antes de eliminar cualquier registro.
  - Indicadores de carga (*spinners* / *skeletons*) en llamadas asíncronas.
- **Adaptabilidad**: Responsivo y compatible con dispositivos Android, iOS y Web.

---

## 📦 Criterios de Entrega del Repositorio en GitHub

El repositorio debe ser público y contener:
1. **Código fuente completo** y limpio sin archivos temporales o generados.
2. **Archivo `.gitignore`** configurado (`node_modules/`, `.env`, builds nativos, caches).
3. **Historial de commits** con participación verificable de todos los integrantes del equipo.
4. **Archivo `README.md` estructurado** con:
   - **Portada**: Asignatura, nombre del proyecto, lista de integrantes con links a GitHub, fecha y logotipo institucional.
   - **Introducción y justificación**: Contexto técnico y relevancia de la app.
   - **Guía de instalación y ejecución**: Pasos claros desde `git clone` hasta la ejecución en Expo Go / emuladores / web.
   - **Credenciales de prueba**: Usuario y contraseña para el docente.
   - **Capturas del funcionamiento**: Login y Dashboard.
   - **Evidencias completas**: Capturas de CRUD (Redes, Subredes), Inventario de Dispositivos y Buscador.

---

## 🛠️ Guía Rápida para Desarrolladores / IAs

Al generar nuevo código o extender funcionalidades:
1. Respetar los tipos declarados en `src/types/index.ts`.
2. Utilizar los tokens de tema definidos en `src/theme/colors.ts` y `src/theme/spacing.ts`.
3. Centralizar las reglas de validación en `src/utils/validators.ts`.
4. Mantener la lógica de base de datos y consultas en la carpeta `src/services/`.
5. Asegurar que las interfaces y mensajes hacia el usuario final estén en **español**.
