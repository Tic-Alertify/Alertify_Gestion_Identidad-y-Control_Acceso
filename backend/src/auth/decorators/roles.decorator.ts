import { SetMetadata } from '@nestjs/common';

// T20: Clave para almacenar los roles requeridos en metadata
export const ROLES_KEY = 'roles';

/**
 * T20: Decorador para especificar los roles permitidos en un endpoint.
 * Uso: @Roles('admin') o @Roles('admin', 'moderador')
 *
 * Los roles se comparan en lowercase, por lo que 'admin' == 'ADMIN'.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
