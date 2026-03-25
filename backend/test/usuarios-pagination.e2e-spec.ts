import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Usuarios paginación (e2e) - T22', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let prisma: PrismaService;

  const testUserPrefix = `t22_user_${Date.now()}`;

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

    // Crear lote de usuarios para asegurar múltiples páginas.
    const usersToCreate = Array.from({ length: 12 }).map((_, index) => ({
      email: `${testUserPrefix}_${index}@alertify.local`,
      username: `${testUserPrefix}_${index}`,
      password_hash: 'test-hash',
      estado: 'activo',
    }));

    await prisma.usuarios.createMany({
      data: usersToCreate,
    });
  });

  afterAll(async () => {
    await prisma.usuarios.deleteMany({
      where: {
        username: {
          startsWith: testUserPrefix,
        },
      },
    });
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
