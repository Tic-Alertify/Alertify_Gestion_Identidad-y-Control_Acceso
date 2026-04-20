import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

const normalizeRoleAlias = (role: string): string => {
  const normalized = role.trim().toLowerCase();

  if (normalized === 'administrador') {
    return 'admin';
  }

  return normalized;
};

/**
 * T20: Guard que verifica los roles del usuario autenticado.
 *
 * Debe usarse junto con JwtAuthGuard para asegurar que request.user exista:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener roles requeridos desde metadata (decorador @Roles)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay roles requeridos, permitir acceso (ruta pública o solo autenticación)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Obtener usuario del request (inyectado por JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    // Si no hay usuario o no tiene roles, denegar acceso
    if (!user || !Array.isArray(user.roles)) {
      throw new ForbiddenException({
        message: 'No tiene permisos para acceder a este recurso.',
        code: 'AUTH_INSUFFICIENT_ROLE',
      });
    }

    // Normalizar roles y aliases comunes para comparación robusta.
    const userRoles = user.roles.map((r) => normalizeRoleAlias(r));
    const normalizedRequired = requiredRoles.map((r) => normalizeRoleAlias(r));

    // Verificar si hay intersección entre roles del usuario y roles requeridos
    const hasRole = normalizedRequired.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException({
        message: 'No tiene permisos para acceder a este recurso.',
        code: 'AUTH_INSUFFICIENT_ROLE',
      });
    }

    return true;
  }
}
