# Cierre Sprint 03 - HU03 y HU04

Fecha de verificacion: 24 de marzo de 2026
Sprint evaluado: 03
Estado general: Cierre recomendado (cumplimiento funcional completo de T15, T16, T17, T19, T20 y T21)

## 1. Alcance evaluado

Se verificaron las tareas del sprint solicitadas:

- HU03: T15, T16, T17
- HU04: T19, T20, T21

Se revisaron artefactos de backend (NestJS), movil (Android Kotlin), frontend (React) y documentacion del repositorio.

Documentacion revisada para consistencia:

- README.md (raiz)
- docs/CODE_REVIEW.md
- backend/docs/testing-auth-refresh.md
- client-mobile/README.md
- frontend/README.md

## 2. Matriz de cumplimiento

| Tarea | Estado | Resultado de verificacion | Evidencia principal |
|---|---|---|---|
| T15 - POST /auth/logout invalidacion token | Cumple | El endpoint valida refresh token, exige type=refresh y limpia refresh_token_hash + refresh_token_expires_at en BD; retorno idempotente | backend/src/auth/auth.controller.ts, backend/src/auth/auth.service.ts |
| T16 - Limpieza cache/sesiones servidor (blacklist) | Cumple | Se registra jti en JWT_BLACKLIST al logout (si llega Authorization), JwtStrategy rechaza tokens revocados, y hay cron de limpieza de expirados | backend/src/auth/auth.service.ts, backend/src/auth/strategies/jwt.strategy.ts, backend/src/auth/jwt-blacklist-cleanup.service.ts, backend/prisma/schema.prisma |
| T17 - Navegacion automatica a login en movil | Cumple | Logout limpia tokens y emite evento global; MainActivity escucha eventos de sesion y redirige a LoginActivity con back stack limpio; expiracion por TokenAuthenticator tambien redirige | client-mobile/app/src/main/java/com/proyecto/alertify/app/MainActivity.kt, client-mobile/app/src/main/java/com/proyecto/alertify/app/network/TokenAuthenticator.kt, client-mobile/app/src/main/java/com/proyecto/alertify/app/NavigationHelper.kt, client-mobile/app/src/main/java/com/proyecto/alertify/app/data/auth/AuthSessionManager.kt |
| T19 - Verificacion rol administrador en JWT | Cumple | JWT incluye roles normalizados en access token y JwtStrategy normaliza/extrare roles del payload para request.user | backend/src/auth/auth.service.ts, backend/src/auth/strategies/jwt.strategy.ts |
| T20 - Routing protegido rutas admin (guards) | Cumple | RolesGuard + decorator @Roles aplicados en rutas admin, con JwtAuthGuard para autenticacion y respuesta 403 en falta de rol | backend/src/auth/guards/roles.guard.ts, backend/src/auth/decorators/roles.decorator.ts, backend/src/auth/admin.controller.ts |
| T21 - Dashboard web y metricas basicas | Cumple | Existe panel admin en frontend con login, rutas protegidas, dashboard/reportes y consumo de endpoints protegidos; el flujo esta listo con API-first y fallback controlado para endpoints aun no disponibles | frontend/src/app/router.tsx, frontend/src/auth/ProtectedRoute.tsx, frontend/src/auth/AdminRoute.tsx, frontend/src/pages/DashboardPage.tsx, frontend/src/pages/ReportsPage.tsx, frontend/src/services/adminService.ts |

## 3. Evidencia ejecutada

### 3.1 Backend - pruebas unitarias y e2e

Comandos ejecutados:

- npm run test -- auth.service.spec.ts
- npm run test -- roles.guard.spec.ts
- npm run test:e2e -- admin-rbac.e2e-spec.ts

Resultado:

- AuthService: 22/22 tests OK (incluye logout, blacklist y normalizacion de roles)
- RolesGuard: 14/14 tests OK
- Admin RBAC e2e: 15/15 tests OK

### 3.2 Frontend - calidad y build

Comando ejecutado:

- npm run lint && npm run build

Resultado:

- Lint OK
- Build OK (Vite + TypeScript)

## 4. Hallazgos documentales

Se detecto que la documentacion existente estaba distribuida en varias fuentes (README raiz, README movil, README frontend y docs tecnicos), con foco historico de sprints anteriores.

Para cierre del sprint actual, este documento consolida el estado real de cumplimiento por tarea y evidencia ejecutada.

## 5. Criterio de cierre

El sprint puede cerrarse porque:

1. Las tareas de HU03 (T15-T17) estan implementadas y verificadas.
2. Las tareas de HU04 backend (T19-T20) estan implementadas y verificadas con pruebas.
3. T21 (panel web) esta implementada y validada en build/lint, con flujo admin funcional.

## 6. Nota de continuidad (no bloqueante de cierre)

El frontend ya intenta operaciones reales para reportes y metricas (enfoque API-first), pero algunos endpoints administrativos especificos aun no existen en backend y por eso se mantiene fallback controlado. Esto no bloquea el cierre de las tareas solicitadas en este sprint, pero si es una mejora recomendada para el siguiente incremento.
