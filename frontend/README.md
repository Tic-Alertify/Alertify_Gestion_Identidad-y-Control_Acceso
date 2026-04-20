# Frontend - Panel administrativo Alertify

Base inicial del panel web administrativo (T21) en React + TypeScript + Vite.

## Organización por Sprint

### Sprint 3 - HU03/HU04 (Web Admin)

- T21: Dashboard y reportes administrativos
- Integración con autenticación por rol admin
- Consumo de endpoints protegidos y manejo de sesión

### Sprint 4 - HU05/HU06 (Administracion de usuarios)

- Integracion del panel con endpoints administrativos de usuarios
- Soporte para listado con paginacion, filtros y busqueda
- Operaciones criticas de cambio de rol y estado con auditoria backend

### Sprint 5 - T28/T29 (Consolidacion frontend admin)

- Confirmacion modal reutilizable para acciones sensibles
- Tabla de usuarios conectada a endpoints reales con paginacion/filtros/busqueda server-side
- Flujo de acciones criticas con confirmacion explicita y refresco de datos

### Referencias de cierre

- `../docs/SPRINT_CIERRE_HU03_HU04.md`
- `../docs/SPRINT_CIERRE_HU05_HU06.md`
- `../docs/SPRINT_CIERRE_SPRINT05_T28_T29.md`
- `../docs/CODE_REVIEW.md`

## Documento de cierre

Para el cierre consolidado por sprint, ver:

- `../docs/SPRINT_CIERRE_HU03_HU04.md`
- `../docs/SPRINT_CIERRE_HU05_HU06.md`
- `../docs/SPRINT_CIERRE_SPRINT05_T28_T29.md`

## Rutas principales

- `/login`
- `/admin/dashboard`
- `/admin/reportes`

## Flujo de autenticación implementado

- Login vía `POST /auth/login`
- Persistencia de `access_token`, `refresh_token` y `user` en `localStorage`
- Validación de rol admin (`admin` / `administrador`)
- Rutas protegidas por sesión (`ProtectedRoute`) y rol (`AdminRoute`)
- Interceptor Axios que agrega `Authorization: Bearer <token>`
- En respuestas `401/403` en endpoints protegidos se limpia sesión y redirige a `/login`

## Servicios

- `src/services/api.ts`: cliente Axios con interceptores de auth
- `src/services/authService.ts`: login/logout + parseo/lectura de sesión
- `src/services/adminService.ts`: consumo protegido de `/admin/health`, dashboard y reportes (con fallback controlado)
- `src/services/admin.ts`: consumo de endpoints reales de usuarios (`/usuarios`)
- `src/components/common/ConfirmDialog.tsx`: confirmacion modal accesible para acciones criticas

Nota: los endpoints de usuarios ya estan integrados al backend real (T29). Para metricas/reportes se mantiene fallback controlado en `adminService` mientras se completan endpoints especificos.

## Variables de entorno

Usa `.env` (o `.env.local`) con:

```env
VITE_API_URL=http://localhost:3000
```

## Ejecución

```bash
npm install
npm run dev
```

## Validación manual sugerida

1. Inicia sesión con un usuario admin válido.
2. Verifica redirección a `/admin/dashboard`.
3. Inicia sesión con usuario sin rol admin y valida acceso denegado.
4. Navega desde el sidebar entre dashboard y reportes.
5. Ejecuta `Cerrar sesión` y verifica limpieza de sesión y vuelta a `/login`.
6. Fuerza un `401/403` desde backend y verifica redirección automática a `/login`.
