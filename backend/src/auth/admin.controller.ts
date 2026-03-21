import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { AuthenticatedUser } from './strategies/jwt.strategy';

/**
 * T19: Controlador para endpoints administrativos protegidos por rol.
 * Todos los endpoints requieren autenticación JWT y rol 'admin'.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  /**
   * GET /admin/test
   * Endpoint de prueba para verificar RBAC.
   * Solo accesible para usuarios con rol 'admin'.
   */
  @Get('test')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  test(
    @Request() req: { user: AuthenticatedUser },
  ): { message: string; user: { id: number; email: string; roles: string[] } } {
    return {
      message: 'Acceso administrativo concedido.',
      user: {
        id: req.user.sub,
        email: req.user.email,
        roles: req.user.roles,
      },
    };
  }

  /**
   * GET /admin/dashboard
   * Otro endpoint administrativo de ejemplo.
   */
  @Get('dashboard')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  dashboard(): { message: string; timestamp: string } {
    return {
      message: 'Bienvenido al panel de administración.',
      timestamp: new Date().toISOString(),
    };
  }
}
