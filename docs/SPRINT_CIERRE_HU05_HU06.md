# Cierre Sprint 04 - HU05 y HU06

Fecha de verificacion: 2 de abril de 2026
Sprint evaluado: 04
Estado general: Cierre recomendado (cumplimiento funcional de T22, T23, T24, T25, T26 y T27)

## 1. Alcance evaluado

Se verificaron las tareas del sprint solicitadas:

- HU05: T22, T23, T24
- HU06: T25, T26, T27

Se revisaron artefactos de backend (NestJS + Prisma + SQL Server), pruebas e2e de usuarios y documentacion consolidada.

Documentacion revisada para consistencia:

- README.md (raiz)
- docs/CODE_REVIEW.md
- backend/README de scripts y pruebas (via package.json)

## 2. Matriz de cumplimiento

| Tarea | Estado | Resultado de verificacion | Evidencia principal |
|---|---|---|---|
| T22 - GET /usuarios con paginacion | Cumple | Endpoint administrativo con page/limit, meta de paginacion y salida segura sin campos sensibles | backend/src/usuarios/usuarios.controller.ts, backend/src/usuarios/usuarios.service.ts, backend/test/usuarios-pagination.e2e-spec.ts |
| T23 - Filtros por estado y rol | Cumple | Se aplican filtros dinamicos sobre el mismo listado, con normalizacion de entrada y compatibilidad con datos existentes | backend/src/usuarios/dto/find-usuarios-query.dto.ts, backend/src/usuarios/usuarios.service.ts, backend/test/usuarios-pagination.e2e-spec.ts |
| T24 - Busqueda por username/email | Cumple | Parametro search integrado con OR sobre username/email, combinable con filtros y paginacion | backend/src/usuarios/dto/find-usuarios-query.dto.ts, backend/src/usuarios/usuarios.service.ts, backend/test/usuarios-pagination.e2e-spec.ts |
| T25 - PATCH /usuarios/:id/rol | Cumple | Cambio de rol admin/ciudadano con validacion de ultimo administrador, transaccion en USER_ROLES y respuesta segura | backend/src/usuarios/dto/update-usuario-rol.dto.ts, backend/src/usuarios/usuarios.controller.ts, backend/src/usuarios/usuarios.service.ts, backend/test/usuarios-rol.e2e-spec.ts |
| T26 - PATCH /usuarios/:id/estado | Cumple | Cambio de estado activo/inactivo con validacion DTO, 404 para usuario inexistente y respuesta segura | backend/src/usuarios/dto/update-usuario-estado.dto.ts, backend/src/usuarios/usuarios.controller.ts, backend/src/usuarios/usuarios.service.ts, backend/test/usuarios-estado.e2e-spec.ts |
| T27 - Audit logs para cambios criticos | Cumple | T25 y T26 registran auditoria en la misma transaccion; si audit log falla, se revierte el cambio principal | backend/src/usuarios/usuarios.service.ts, backend/test/usuarios-estado.e2e-spec.ts, backend/test/usuarios-rol.e2e-spec.ts, backend/prisma/schema.prisma |

## 3. Evidencia ejecutada

### 3.1 Backend - pruebas e2e por tarea

Comandos ejecutados:

- npm run test:e2e -- test/usuarios-pagination.e2e-spec.ts
- npm run test:e2e -- test/usuarios-estado.e2e-spec.ts
- npm run test:e2e -- test/usuarios-rol.e2e-spec.ts

Resultado:

- Usuarios paginacion/filtros/busqueda (T22/T23/T24): 13/13 tests OK
- Usuarios cambio de estado (T26 + evidencia T27): 7/7 tests OK
- Usuarios cambio de rol (T25 + evidencia T27): 8/8 tests OK

### 3.2 Evidencia especifica de T27 (atomicidad)

Se validaron escenarios de rollback transaccional:

1. Cambio principal exitoso + audit log exitoso: ambos persisten.
2. Cambio principal fallido (validacion o no encontrado): no se registra auditoria.
3. Falla de insercion en AUDIT_LOG dentro de la transaccion: el cambio principal se revierte.

Implementacion aplicada segun esquema actual de `AUDIT_LOG`:

- Campo disponible para actor: `user_id` (admin ejecutor).
- Campo `action` enriquecido con contexto: accion, actor, target y before/after.

## 4. Hallazgos documentales

Durante Sprint 4, el alcance evoluciono hacia administracion de usuarios en backend con foco en panel web:

- listado paginado de usuarios,
- filtros y busqueda combinables,
- cambios criticos de estado y rol,
- trazabilidad por auditoria transaccional.

Este documento consolida el cierre funcional del sprint y la evidencia de ejecucion por tarea.

## 5. Criterio de cierre

El sprint puede cerrarse porque:

1. Las tareas T22, T23 y T24 estan implementadas y verificadas en pruebas e2e.
2. Las tareas T25 y T26 cumplen seguridad por rol admin, validaciones y respuestas seguras.
3. T27 garantiza atomicidad de auditoria con rollback real cuando falla el registro de log.

## 6. Nota de continuidad (no bloqueante de cierre)

El modelo actual de auditoria usa `user_id` como actor y `action` enriquecida para incluir target y before/after. Como mejora futura, puede evaluarse una extension de esquema para almacenar actor/target/metadata en columnas dedicadas o JSON estructurado, sin bloquear el cierre del sprint actual.
