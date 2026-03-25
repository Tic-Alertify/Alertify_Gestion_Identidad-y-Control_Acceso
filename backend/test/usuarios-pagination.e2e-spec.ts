import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

jest.setTimeout(30000);

describe('Usuarios paginación, filtros y búsqueda (e2e) - T22/T23/T24', () => {
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
      { suffix: 'admin_alertify_search', estado: 'activo', roleId: adminRole.id },
      { suffix: 'ciudadano_activo_1', estado: 'activo', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_activo_2', estado: 'activo', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_activo_3', estado: 'activo', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_activo_4', estado: 'activo', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_activo_5', estado: 'activo', roleId: ciudadanoRole.id },
      { suffix: 'johan_ciudadano', estado: 'activo', roleId: ciudadanoRole.id },
      { suffix: 'erick_ciudadano', estado: 'activo', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_bloqueado_1', estado: 'bloqueado', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_bloqueado_2', estado: 'bloqueado', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_bloqueado_3', estado: 'bloqueado', roleId: ciudadanoRole.id },
      { suffix: 'ciudadano_bloqueado_4', estado: 'bloqueado', roleId: ciudadanoRole.id },
      { suffix: 'gmail_probe', estado: 'activo', roleId: ciudadanoRole.id },
    ];

    for (const entry of usersToCreate) {
      const username = `${testUserPrefix}_${entry.suffix}`;
      let email = `${testUserPrefix}_${entry.suffix}@alertify.local`;

      if (entry.suffix.includes('johan')) {
        email = `johan.${testUserPrefix}@alertify.local`;
      }
      if (entry.suffix.includes('erick')) {
        email = `erick.${testUserPrefix}@alertify.local`;
      }
      if (entry.suffix.includes('gmail')) {
        email = `${testUserPrefix}.gmailprobe@gmail.com`;
      }
      if (entry.suffix.includes('admin_alertify_search')) {
        email = `admin.${testUserPrefix}@alertify.com`;
      }

      await prisma.usuarios.create({
        data: {
          email,
          username,
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
  }, 30000);

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      `DELETE FROM AUDIT_LOG WHERE user_id IN (SELECT id FROM USUARIOS WHERE username LIKE '${testUserPrefix}%')`,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM USER_ROLES WHERE user_id IN (SELECT id FROM USUARIOS WHERE username LIKE '${testUserPrefix}%')`,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM USUARIOS WHERE username LIKE '${testUserPrefix}%'`,
    );
    await app.close();
  }, 30000);

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

  it('debe buscar por search en username o email (search=johan)', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .get('/usuarios?search=johan&limit=50')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    for (const usuario of response.body.data as Array<Record<string, unknown>>) {
      const username = String(usuario.username).toLowerCase();
      const email = String(usuario.email).toLowerCase();
      expect(username.includes('johan') || email.includes('johan')).toBe(true);
    }
  });

  it('debe buscar por email con search=gmail', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .get('/usuarios?search=gmail&limit=50')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    for (const usuario of response.body.data as Array<Record<string, unknown>>) {
      expect(String(usuario.email).toLowerCase().includes('gmail')).toBe(true);
    }
  });

  it('debe aplicar estado + search simultáneamente', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .get('/usuarios?estado=activo&search=admin&limit=50')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    for (const usuario of response.body.data as Array<Record<string, unknown>>) {
      const username = String(usuario.username).toLowerCase();
      const email = String(usuario.email).toLowerCase();
      expect(String(usuario.estado).toLowerCase()).toBe('activo');
      expect(username.includes('admin') || email.includes('admin')).toBe(true);
    }
  });

  it('debe aplicar rol + search simultáneamente', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .get('/usuarios?rol=admin&search=alertify&limit=50')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    for (const usuario of response.body.data as Array<Record<string, unknown>>) {
      const username = String(usuario.username).toLowerCase();
      const email = String(usuario.email).toLowerCase();
      const roles = (usuario.roles as string[]) ?? [];

      expect(username.includes('alertify') || email.includes('alertify')).toBe(
        true,
      );
      expect(roles.some((role) => ['admin', 'administrador'].includes(role))).toBe(
        true,
      );
    }
  });

  it('debe ignorar search vacío (solo espacios)', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const [withoutSearch, withBlankSearch] = await Promise.all([
      request(app.getHttpServer())
        .get('/usuarios?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200),
      request(app.getHttpServer())
        .get('/usuarios?page=1&limit=10&search=%20%20%20')
        .set('Authorization', `Bearer ${token}`)
        .expect(200),
    ]);

    expect(withBlankSearch.body.meta.total).toBe(withoutSearch.body.meta.total);
    expect(withBlankSearch.body.meta.page).toBe(withoutSearch.body.meta.page);
    expect(withBlankSearch.body.meta.limit).toBe(withoutSearch.body.meta.limit);
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
