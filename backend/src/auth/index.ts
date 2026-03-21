// T20: Re-export de guards, decoradores e interfaces del módulo Auth

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { RolesGuard } from './guards/roles.guard';

// Decoradores
export { Roles, ROLES_KEY } from './decorators/roles.decorator';

// Interfaces
export { JwtPayload, AuthenticatedUser } from './strategies/jwt.strategy';
