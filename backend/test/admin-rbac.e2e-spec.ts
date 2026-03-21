import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * T19: Tests e2e para validar RBAC en endpoints administrativos.
 *
 * Estos tests verifican:
 * - Caso 1: token con roles ['admin'] -> acceso permitido a ruta protegida
 * - Caso 2: token con roles ['ciudadano'] -> 403 AUTH_INSUFFICIENT_ROLE
 * - Caso 3: token válido sin roles -> 403
 * - Caso 4: token inválido -> 401
 */
describe('Admin RBAC (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let configService: ConfigService;

  // Helper para generar tokens de prueba
  const generateTestToken = (
    payload: { sub: number; email: string; roles: string[] },
    secret: string,
  ): string => {
    return jwtService.sign(
      { ...payload, jti: 'test-jti-' + Date.now() },
      { secret, expiresIn: '15m' },
    );
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── T19-1: Token con rol admin → acceso permitido ─────────────────

  describe('GET /admin/test - Usuario con rol admin', () => {
    it('debe permitir acceso y responder 200 con datos del usuario', async () => {
      const accessSecret =
        configService.get<string>('JWT_ACCESS_SECRET') ??
        configService.get<string>('JWT_SECRET');

      const token = generateTestToken(
        { sub: 1, email: 'admin@test.com', roles: ['admin'] },
        accessSecret!,
      );

      const response = await request(app.getHttpServer())
        .get('/admin/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Acceso administrativo concedido.',
        user: {
          id: 1,
          email: 'admin@test.com',
          roles: ['admin'],
        },
      });
    });

    it('debe permitir acceso con rol ADMIN en mayúsculas (normalización)', async () => {
      const accessSecret =
        configService.get<string>('JWT_ACCESS_SECRET') ??
        configService.get<string>('JWT_SECRET');

      const token = generateTestToken(
        { sub: 2, email: 'ADMIN@test.com', roles: ['ADMIN'] },
        accessSecret!,
      );

      const response = await request(app.getHttpServer())
        .get('/admin/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Acceso administrativo concedido.');
    });

    it('debe permitir acceso con múltiples roles incluyendo admin', async () => {
      const accessSecret =
        configService.get<string>('JWT_ACCESS_SECRET') ??
        configService.get<string>('JWT_SECRET');

      const token = generateTestToken(
        { sub: 3, email: 'super@test.com', roles: ['ciudadano', 'moderador', 'admin'] },
        accessSecret!,
      );

      await request(app.getHttpServer())
        .get('/admin/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  // ─── T19-2: Token con rol ciudadano → 403 AUTH_INSUFFICIENT_ROLE ────

  describe('GET /admin/test - Usuario con rol ciudadano', () => {
    it('debe denegar acceso y responder 403 con código AUTH_INSUFFICIENT_ROLE', async () => {
      const accessSecret =
        configService.get<string>('JWT_ACCESS_SECRET') ??
        configService.get<string>('JWT_SECRET');

      const token = generateTestToken(
        { sub: 10, email: 'ciudadano@test.com', roles: ['ciudadano'] },
        accessSecret!,
      );

      const response = await request(app.getHttpServer())
        .get('/admin/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toMatchObject({
        message: 'No tiene permisos para acceder a este recurso.',
        code: 'AUTH_INSUFFICIENT_ROLE',
      });
    });

    it('debe denegar acceso con rol moderador (no admin)', async () => {
      const accessSecret =
        configService.get<string>('JWT_ACCESS_SECRET') ??
        configService.get<string>('JWT_SECRET');

      const token = generateTestToken(
        { sub: 11, email: 'mod@test.com', roles: ['moderador'] },
        accessSecret!,
      );

      await request(app.getHttpServer())
        .get('/admin/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ─── T19-3: Token válido sin roles → 403 ────────────────────────────

  describe('GET /admin/test - Usuario sin roles', () => {
    it('debe denegar acceso cuando roles es array vacío', async () => {
      const accessSecret =
        configService.get<string>('JWT_ACCESS_SECRET') ??
        configService.get<string>('JWT_SECRET');

      const token = generateTestToken(
        { sub: 20, email: 'sinroles@test.com', roles: [] },
        accessSecret!,
      );

      const response = await request(app.getHttpServer())
        .get('/admin/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.code).toBe('AUTH_INSUFFICIENT_ROLE');
    });
  });

  // ─── T19-4: Token inválido → 401 ────────────────────────────────────

  describe('GET /admin/test - Token inválido', () => {
    it('debe responder 401 cuando no hay token', async () => {
      await request(app.getHttpServer())
        .get('/admin/test')
        .expect(401);
    });

    it('debe responder 401 con token malformado', async () => {
      await request(app.getHttpServer())
        .get('/admin/test')
        .set('Authorization', 'Bearer invalid-token-123')
        .expect(401);
    });

    it('debe responder 401 con secret incorrecto', async () => {
      const token = jwtService.sign(
        { sub: 30, email: 'hacker@test.com', roles: ['admin'], jti: 'hack' },
        { secret: 'wrong-secret', expiresIn: '15m' },
      );

      await request(app.getHttpServer())
        .get('/admin/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('debe responder 401 con token expirado', async () => {
      const accessSecret =
        configService.get<string>('JWT_ACCESS_SECRET') ??
        configService.get<string>('JWT_SECRET');

      const token = jwtService.sign(
        { sub: 31, email: 'expired@test.com', roles: ['admin'], jti: 'exp' },
        { secret: accessSecret!, expiresIn: '-1s' }, // ya expiró
      );

      await request(app.getHttpServer())
        .get('/admin/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  // ─── T19-5: Endpoint /admin/dashboard ───────────────────────────────

  describe('GET /admin/dashboard', () => {
    it('debe permitir acceso con rol admin', async () => {
      const accessSecret =
        configService.get<string>('JWT_ACCESS_SECRET') ??
        configService.get<string>('JWT_SECRET');

      const token = generateTestToken(
        { sub: 1, email: 'admin@test.com', roles: ['admin'] },
        accessSecret!,
      );

      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Bienvenido al panel de administración.');
      expect(response.body.timestamp).toBeDefined();
    });

    it('debe denegar acceso sin rol admin', async () => {
      const accessSecret =
        configService.get<string>('JWT_ACCESS_SECRET') ??
        configService.get<string>('JWT_SECRET');

      const token = generateTestToken(
        { sub: 10, email: 'ciudadano@test.com', roles: ['ciudadano'] },
        accessSecret!,
      );

      await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});
