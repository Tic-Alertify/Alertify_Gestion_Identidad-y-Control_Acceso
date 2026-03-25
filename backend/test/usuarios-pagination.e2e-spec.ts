import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Usuarios paginación y filtros (e2e) - T22/T23', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let prisma: PrismaService;

  const testUserPrefix = `t23_user_${Date.now()}`;

  const generateTestToken = (
    payload: { sub: number; email: string; roles: string[] },
    secret: string,
  ): string => {
    return jwtService.sign(
      { ...payload, jti: 't22-jti-' + Date.now() + '-' + Math.random() },
      { secret, expiresIn: '15m' },
    );
  };

  const getAccessSecret = (): string => {
    return (
      configService.get<string>('JWT_ACCESS_SECRET') ??
      configService.get<string>('JWT_SECRET') ??
      'fallback-secret'
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
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    const adminRole =
      (await prisma.roles.findFirst({
        where: {
          nombre: {
            in: ['admin', 'ADMIN', 'administrador', 'ADMINISTRADOR'],
          },
        },
      })) ??
      (await prisma.roles.create({
        data: {
          nombre: 'admin',
          descripcion: 'Rol admin para pruebas e2e T23',
        },
      }));

    const ciudadanoRole =
      (await prisma.roles.findFirst({
        where: {
          nombre: {
            in: ['ciudadano', 'CIUDADANO'],
          },
        },
      })) ??
      (await prisma.roles.create({
        data: {
          nombre: 'ciudadano',
          descripcion: 'Rol ciudadano para pruebas e2e T23',
        },
      }));

    const usersToCreate = [
      { suffix: 'admin_1', estado: 'activo', roleId: adminRole.id },
      { suffix: 'admin_2', estado: 'activo', roleId: adminRole.id },
      { suffix: 'admin_3', estado: 'activo', roleId: adminRole.id },
      { suffix: 'ciudadano_activo_1', estado: 'activo', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_activo_2', estado: 'activo', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_activo_3', estado: 'activo', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_activo_4', estado: 'activo', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_activo_5', estado: 'activo', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_bloqueado_1', estado: 'bloqueado', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_bloqueado_2', estado: 'bloqueado', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_bloqueado_3', estado: 'bloqueado', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_bloqueado_4', estado: 'bloqueado', roleId: ciudadanoRole.id },
    ];

    for (const entry of usersToCreate) {
      await prisma.usuarios.create({
        data: {
          email: `${testUserPrefix}_${entry.suffix}@alertify.local`,
          username: `${testUserPrefix}_${entry.suffix}`,
          password_hash: 'test-hash',
          estado: entry.estado,
          user_roles: {
            create: {
              role_id: entry.roleId,
            },
          },
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      `DELETE FROM USER_ROLES WHERE user_id IN (SELECT id FROM USUARIOS WHERE username LIKE '${testUserPrefix}%')`,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM USUARIOS WHERE username LIKE '${testUserPrefix}%'`,
    );
    await app.close();
  });

  it('debe paginar con valores por defecto (page=1, limit=10)', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.limit).toBe(10);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeLessThanOrEqual(10);
  });

  it('debe responder con page=2&limit=10 y metadatos coherentes', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .get('/usuarios?page=2&limit=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.meta.page).toBe(2);
    expect(response.body.meta.limit).toBe(10);
    expect(response.body.meta.hasPreviousPage).toBe(true);
    expect(typeof response.body.meta.total).toBe('number');
    expect(typeof response.body.meta.totalPages).toBe('number');
  });

  it('debe permitir acceso solo a admin (token admin -> 200)', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('debe denegar acceso a usuario sin rol admin (403)', async () => {
    const token = generateTestToken(
      { sub: 2, email: 'ciudadano@alertify.com', roles: ['ciudadano'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body.code).toBe('AUTH_INSUFFICIENT_ROLE');
  });

  it('debe filtrar por estado=bloqueado (case-insensitive)', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .get('/usuarios?estado=%20BLOQUEADO%20&limit=50')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    for (const usuario of response.body.data as Array<Record<string, unknown>>) {
      expect(String(usuario.estado).toLowerCase()).toBe('bloqueado');
    }
  });

  it('debe filtrar por rol=admin (case-insensitive)', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .get('/usuarios?rol=%20ADMIN%20&limit=50')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    for (const usuario of response.body.data as Array<Record<string, unknown>>) {
      const roles = (usuario.roles as string[]) ?? [];
      expect(roles.length).toBeGreaterThan(0);
      expect(roles.some((role) => ['admin', 'administrador'].includes(role))).toBe(
        true,
      );
    }
  });

  it('debe aplicar intersección estado=activo y rol=ciudadano', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .get('/usuarios?estado=activo&rol=ciudadano&limit=50')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    for (const usuario of response.body.data as Array<Record<string, unknown>>) {
      expect(String(usuario.estado).toLowerCase()).toBe('activo');
      const roles = (usuario.roles as string[]) ?? [];
      expect(roles.includes('ciudadano')).toBe(true);
    }
  });

  it('no debe exponer campos sensibles en la respuesta', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .get('/usuarios?limit=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    const first = response.body.data[0] as Record<string, unknown>;

    expect(first).not.toHaveProperty('password_hash');
    expect(first).not.toHaveProperty('refresh_token_hash');
    expect(first).not.toHaveProperty('refresh_token_expires_at');
  });
});
