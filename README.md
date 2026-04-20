# Alertify - Módulo de Gestión de Identidad y Control de Acceso

## Información general
- **Sprint actual**: 5 (consolidacion frontend admin: tabla de usuarios server-side y confirmacion modal para acciones sensibles)
- **Tecnologías backend**: NestJS, TypeScript, SQL Server, Prisma, JWT (access + refresh)
- **Tecnologías móvil**: Android (Kotlin), Retrofit, OkHttp, SharedPreferences
- **Estado**: Backend funcional + app movil conectada + panel web admin con gestion de usuarios integrada

Este repositorio contiene el microservicio de autenticación y autorización para Alertify, con enfoque en gestión de identidad y control de acceso basado en roles (RBAC), junto con la aplicación móvil Android que consume sus endpoints.

## Organización por Sprint

### Sprint 1 - Backend de autenticación

Cobertura principal en este README y en documentación técnica de backend.

- T02: `POST /auth/registro`
- T03: Hashing bcrypt
- T04: Almacenamiento con rol por defecto
- T05: Manejo de errores
- T07: Pruebas unitarias de registro
- T08: `POST /auth/login`
- T09: JWT con claims
- T10: Refresh token + rotación

Referencias:

- `backend/docs/testing-auth-refresh.md`
- `docs/CODE_REVIEW.md`

### Sprint 2 - Integración móvil de autenticación

Cobertura detallada en README móvil.

- T06: UI formulario registro (Android)
- T11: Validación de estado de cuenta
- T12: Manejo de errores de autenticación
- T13: UI login móvil
- T14: Persistencia de sesión en dispositivo

Referencia:

- `client-mobile/README.md`

### Sprint 3 - Cierre HU03 y HU04

Cobertura consolidada de cierre funcional y documental.

- T15: Logout e invalidación de refresh token
- T16: JWT blacklist y revocación inmediata
- T17: Navegación automática a login en móvil
- T19: Verificación de rol administrador en JWT
- T20: Rutas admin protegidas con guards
- T21: Panel administrativo web con métricas básicas

Referencias:

- `docs/SPRINT_CIERRE_HU03_HU04.md`
- `docs/CODE_REVIEW.md`
- `frontend/README.md`

### Sprint 4 - Administracion de usuarios (HU05/HU06)

Cobertura consolidada de endpoints administrativos de usuarios y auditoria transaccional.

- T22: GET /usuarios con paginacion + metadata
- T23: filtros por estado y rol
- T24: busqueda por username/email
- T25: PATCH /usuarios/:id/rol con validacion de ultimo admin
- T26: PATCH /usuarios/:id/estado (activo/inactivo)
- T27: audit logs para cambios criticos en la misma transaccion

Referencias:

- `docs/SPRINT_CIERRE_HU05_HU06.md`
- `docs/CODE_REVIEW.md`

### Sprint 5 - Consolidacion frontend admin (T28/T29)

Cobertura consolidada de UX segura y consumo real de endpoints de usuarios en el panel administrativo web.

- T28: confirmacion modal reutilizable para acciones sensibles (bloquear/desbloquear y cambios de rol)
- T29: tabla de usuarios con busqueda, filtros, paginacion server-side y acciones criticas integradas al backend

Referencias:

- `docs/SPRINT_CIERRE_SPRINT05_T28_T29.md`
- `frontend/README.md`

## Funcionalidades implementadas

### Registro de usuarios (`POST /auth/registro`)
- Validación de correo electrónico único
- Validación de nombre de usuario alfanumérico (4 a 20 caracteres)
- Validación de contraseña (mínimo 8 caracteres, al menos 1 mayúscula y 1 número)
- Cifrado de contraseña con `bcrypt` (10 rondas)
- Asignación automática del rol `CIUDADANO`

### Autenticación (`POST /auth/login`)
- Verificación de credenciales con `bcrypt.compare`
- Generación de `access_token` JWT (15 min, configurable con `JWT_ACCESS_TTL`)
- Generación de `refresh_token` JWT (7 días, configurable con `JWT_REFRESH_TTL`)
- Hash SHA-256 del refresh token almacenado en DB (nunca en texto plano)
- Validación de estado de cuenta (activa, bloqueada, inactiva)
- Claims access: `sub`, `email`, `roles` · Claims refresh: `sub`, `type`, `jti`

### Refresh token (`POST /auth/refresh`) — T10
- Verifica firma y expiración del refresh token con secret independiente
- Compara hash SHA-256 contra el almacenado en DB
- Valida que el usuario siga activo (no bloqueado/inactivo)
- **Rotación**: genera nuevos access + refresh tokens; el anterior se invalida
- Respuesta: `{ access_token, refresh_token }`

### Logout (`POST /auth/logout`) — T10
- Invalida el refresh token limpiando su hash de la DB
- Acepta tokens expirados (decode sin verify) para garantizar cierre limpio
- Respuesta: `{ message: "Sesión cerrada" }`

### Auditoría
- Registro de eventos `REGISTRO_USUARIO` y `LOGIN_EXITOSO`
- Persistencia en tabla `AUDIT_LOG`

### Validación de estado de cuenta — T11
- Estado normalizado con `trim().toLowerCase()` antes de comparar
- `bloqueado` → 403 con código `AUTH_ACCOUNT_BLOCKED`
- `inactivo` → 403 con código `AUTH_ACCOUNT_INACTIVE`
- Cualquier estado distinto de `activo` → 403 `AUTH_ACCOUNT_INACTIVE`
- Validación aplicada en **login** y **refresh** (doble barrera)

### Manejo de errores de autenticación — T12
- Filtro global `GlobalExceptionFilter` para respuestas estandarizadas
- Uso consistente de códigos HTTP (201, 400, 401, 403, 409, 500)
- Códigos de error específicos del backend:

| Código | HTTP | Contexto |
|--------|------|----------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Email o contraseña incorrectos |
| `AUTH_ACCOUNT_BLOCKED` | 403 | Cuenta bloqueada |
| `AUTH_ACCOUNT_INACTIVE` | 403 | Cuenta inactiva o no habilitada |
| `AUTH_REFRESH_INVALID` | 401 | Refresh token inválido, expirado o ya rotado |
| `VALIDATION_ERROR` | 400 | Datos de entrada inválidos (DTO) |
| `RESOURCE_CONFLICT` | 409 | Email o username duplicado |
| `AUTH_UNEXPECTED_ERROR` | 500 | Error interno no controlado |

- Respuesta estandarizada: `{ statusCode, message, error, code, path, requestId, timestamp }`
- `requestId` inyectado por middleware para trazabilidad end-to-end

## Stack tecnológico
| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | NestJS | 11.x |
| Lenguaje | TypeScript | 5.x |
| Base de datos | SQL Server | 2019+ |
| ORM | Prisma | 7.x |
| Autenticación | `@nestjs/jwt` | 11.x |
| Hashing | `bcrypt` | 6.x |
| Validación | `class-validator` | 0.14.x |

### Móvil (`client-mobile/`)

| Componente | Tecnología | Versión |
|------------|------------|--------|
| Lenguaje | Kotlin | 2.0.21 |
| Networking | Retrofit + OkHttp | 2.11.0 / 4.12.0 |
| Serialización | Gson | 2.11.0 |
| Persistencia local | SharedPreferences | Android SDK |
| Coroutines | kotlinx-coroutines | 1.8.1 |
| Min SDK | Android 7.0 (API 24) | — |
## Estructura del proyecto

```text
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.service.spec.ts  # T07: unit tests registro
│   ├── auth.module.ts
│   ├── dto/
│   │   ├── registro.dto.ts
│   │   ├── login.dto.ts
│   │   ├── refresh.dto.ts      # T10
│   │   └── logout.dto.ts       # T10
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   └── strategies/
│       └── jwt.strategy.ts
├── usuarios/
│   ├── usuarios.service.ts
│   └── usuarios.module.ts
├── prisma/
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── common/
│   └── filters/
│       └── http-exception.filter.ts
└── main.ts

prisma/
├── schema.prisma
└── seed.ts

docs/testing/postman/
└── Alertify_Sprint1.postman_collection.json

backend/docs/
└── testing-auth-refresh.md   # T10: guía de testing con curl/Postman
```

## Modelo de datos

```sql
USUARIOS (id, email*, username*, password_hash, estado, puntuacion, refresh_token_hash?, refresh_token_expires_at?, created_at, updated_at)
ROLES (id, nombre*, descripcion)
USER_ROLES (user_id, role_id) [PK compuesta]
AUDIT_LOG (id, user_id, action, created_at)

* = restricción UNIQUE
```

### Roles predefinidos

| ID | Nombre | Descripción |
|----|--------|-------------|
| 1 | CIUDADANO | Rol por defecto para usuarios registrados |
| 2 | ADMINISTRADOR | Gestión completa del sistema |



## Endpoints disponibles

| Método | Endpoint | Body | Respuesta | Autenticación |
|--------|----------|------|-----------|---------------|
| `POST` | `/auth/registro` | `{email, username, password}` | `{message, userId}` | No |
| `POST` | `/auth/login` | `{email, password}` | `{access_token, refresh_token, user}` | No |
| `POST` | `/auth/refresh` | `{refresh_token}` | `{access_token, refresh_token}` | No |
| `POST` | `/auth/logout` | `{refresh_token}` | `{message}` | No |

## Pruebas

### Pruebas unitarias — T07

Archivo: `src/auth/auth.service.spec.ts` — 5 tests con Jest (sin DB real)

| # | Test | Resultado esperado |
|---|------|--------------------|
| 1 | Email duplicado | `ConflictException` · `$transaction` no se llama |
| 2 | Username duplicado | `ConflictException` · `$transaction` no se llama |
| 3 | Registro exitoso | `{ message, userId }` · `estado:'activo'` · `role_id:1` · audit `REGISTRO_USUARIO` |
| 4 | HttpException en tx | Se re-lanza la misma excepción |
| 5 | Error genérico en tx | `InternalServerErrorException('Error al registrar el usuario')` |

Mocks: `UsuariosService`, `PrismaService` (con `txMock`), `JwtService`, `ConfigService`. `hashPassword` espiado para evitar bcrypt real.

### Pruebas de integración — T10

15 aserciones ejecutadas con script Node.js contra el backend corriendo:

| # | Test | Resultado esperado |
|---|------|--------------------|
| 1 | Login devuelve tokens | `access_token` + `refresh_token` + `user` |
| 2 | Refresh devuelve nuevos tokens | `access_token` + `refresh_token` (nuevos) |
| 3 | Rotación invalida token anterior | Token viejo → 401 `AUTH_REFRESH_INVALID` |
| 4 | Logout cierra sesión | `{ message: "Sesión cerrada" }` |
| 5 | Refresh post-logout falla | 401 `AUTH_REFRESH_INVALID` |

### Casos incluidos en Postman (Sprint 1)

1. Registro exitoso
2. Correo duplicado (409)
3. Usuario duplicado (409)
4. Validaciones de DTO (400)
5. Inicio de sesión exitoso
6. Contraseña incorrecta (401)
7. Correo inexistente (401)
8. Cuenta bloqueada (403)

### Comandos de pruebas automatizadas

```bash
# Unit tests (T07)
npm run test

# Tests e2e
npm run test:e2e

# Cobertura
npm run test:cov
```

## Variables de entorno (backend)

```env
JWT_ACCESS_SECRET=clave-access-segura       # Firma access tokens
JWT_ACCESS_TTL=15m                           # Expiración access token
JWT_REFRESH_SECRET=clave-refresh-segura      # Firma refresh tokens (clave diferente)
JWT_REFRESH_TTL=7d                           # Expiración refresh token
JWT_SECRET=clave-legacy                      # Fallback si JWT_ACCESS_SECRET no existe
```

## Seguridad

- Contraseñas cifradas con `bcrypt` (10 rondas)
- JWT firmado con algoritmo HS256; secrets separados para access y refresh
- Refresh tokens almacenados como hash SHA-256 en DB (nunca en texto plano)
- Rotación automática: cada refresh invalida el token anterior
- Validación de entrada con `class-validator`
- Consultas parametrizadas mediante Prisma
- CORS habilitado para integración con frontend móvil

Para entornos productivos, es obligatorio usar claves robustas para `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`.

## Documentación adicional

- [CODE_REVIEW](./docs/CODE_REVIEW.md)
- [Azure SQL Setup (Backend)](./backend/docs/azure-sql-setup.md)
- [Testing Auth Refresh (T10)](./backend/docs/testing-auth-refresh.md) — Guía con curl/Postman para refresh y logout
- [Colección Postman](./docs/testing/postman/)
- [README App Móvil](./client-mobile/README.md) — Arquitectura de red, persistencia de sesión (T14), refresh token (T10) y flujos de login/registro
- [Cierre Sprint HU03-HU04](./docs/SPRINT_CIERRE_HU03_HU04.md) — Verificación consolidada de T15, T16, T17, T19, T20 y T21
- [Cierre Sprint HU05-HU06](./docs/SPRINT_CIERRE_HU05_HU06.md) — Verificacion consolidada de T22, T23, T24, T25, T26 y T27
- [Cierre Sprint 05 (T28/T29)](./docs/SPRINT_CIERRE_SPRINT05_T28_T29.md) — Verificacion consolidada de confirmacion modal y tabla de usuarios server-side en frontend admin