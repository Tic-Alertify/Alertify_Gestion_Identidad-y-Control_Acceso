import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockExecutionContext = (user: any): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext);

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  // ─── T19-1: Sin roles requeridos → permite acceso ───────────────────

  it('debe permitir acceso cuando no hay roles requeridos', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = mockExecutionContext({ sub: 1, roles: ['ciudadano'] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debe permitir acceso cuando roles requeridos es un array vacío', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const context = mockExecutionContext({ sub: 1, roles: ['ciudadano'] });

    expect(guard.canActivate(context)).toBe(true);
  });

  // ─── T19-2: Usuario con rol admin accede a ruta @Roles('admin') ─────

  it('debe permitir acceso cuando usuario tiene rol admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockExecutionContext({
      sub: 1,
      email: 'admin@test.com',
      roles: ['admin'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debe permitir acceso con roles en mayúsculas (normalización)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockExecutionContext({
      sub: 1,
      email: 'admin@test.com',
      roles: ['ADMIN'], // mayúsculas
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debe permitir acceso con roles con espacios (normalización)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockExecutionContext({
      sub: 1,
      email: 'admin@test.com',
      roles: ['  Admin  '], // con espacios
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  // ─── T19-3: Usuario con múltiples roles ─────────────────────────────

  it('debe permitir acceso si usuario tiene múltiples roles incluyendo admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockExecutionContext({
      sub: 1,
      email: 'super@test.com',
      roles: ['ciudadano', 'moderador', 'admin'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debe permitir acceso si cualquiera de los roles requeridos coincide', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'superadmin']);
    const context = mockExecutionContext({
      sub: 1,
      email: 'admin@test.com',
      roles: ['admin'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  // ─── T19-4: Usuario con rol ciudadano NO accede a ruta admin ────────

  it('debe lanzar ForbiddenException cuando usuario no tiene rol requerido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockExecutionContext({
      sub: 2,
      email: 'ciudadano@test.com',
      roles: ['ciudadano'],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debe lanzar ForbiddenException con código AUTH_INSUFFICIENT_ROLE', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockExecutionContext({
      sub: 2,
      email: 'ciudadano@test.com',
      roles: ['ciudadano'],
    });

    try {
      guard.canActivate(context);
      fail('Debería haber lanzado ForbiddenException');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        message: 'No tiene permisos para acceder a este recurso.',
        code: 'AUTH_INSUFFICIENT_ROLE',
      });
    }
  });

  // ─── T19-5: Usuario sin roles → 403 ─────────────────────────────────

  it('debe lanzar ForbiddenException cuando usuario no tiene roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockExecutionContext({
      sub: 3,
      email: 'sinroles@test.com',
      roles: [], // sin roles
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debe lanzar ForbiddenException cuando user.roles no es array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockExecutionContext({
      sub: 4,
      email: 'broken@test.com',
      roles: 'admin', // string en lugar de array
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debe lanzar ForbiddenException cuando user.roles es undefined', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockExecutionContext({
      sub: 5,
      email: 'nroles@test.com',
      // roles: undefined
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  // ─── T19-6: Sin usuario en request → 403 ────────────────────────────

  it('debe lanzar ForbiddenException cuando no hay usuario en request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockExecutionContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debe lanzar ForbiddenException cuando user es null', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
