import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

jest.setTimeout(30000);

describe('Usuarios cambio de estado (e2e) - T26', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let prisma: PrismaService;

  const testUserPrefix = `t26_user_${Date.now()}`;
  let usuarioActivoId = 0;
  let usuarioInactivoId = 0;

  const generateTestToken = (
    payload: { sub: number; email: string; roles: string[] },
    secret: string,
  ): string => {
    return jwtService.sign(
      { ...payload, jti: 't26-jti-' + Date.now() + '-' + Math.random() },
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
        exceptionFactory: (errors) => {
          const messages = errors.flatMap((err) =>
            Object.values(err.constraints || {}),
          );

          return new BadRequestException({
            message: messages,
            code: 'VALIDATION_ERROR',
          });
        },
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    prisma = moduleFixture.get<PrismaService>(PrismaService);

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
          descripcion: 'Rol ciudadano para pruebas e2e T26',
        },
      }));

    const usuarioActivo = await prisma.usuarios.create({
      data: {
        email: `${testUserPrefix}_activo@alertify.local`,
        username: `${testUserPrefix}_activo`,
        password_hash: 'test-hash',
        estado: 'activo',
        user_roles: {
          create: {
            role_id: ciudadanoRole.id,
          },
        },
      },
    });

    const usuarioInactivo = await prisma.usuarios.create({
      data: {
        email: `${testUserPrefix}_inactivo@alertify.local`,
        username: `${testUserPrefix}_inactivo`,
        password_hash: 'test-hash',
        estado: 'inactivo',
        user_roles: {
          create: {
            role_id: ciudadanoRole.id,
          },
        },
      },
    });

    usuarioActivoId = usuarioActivo.id;
    usuarioInactivoId = usuarioInactivo.id;
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

  it('admin cambia estado de activo a inactivo -> 200', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .patch(`/usuarios/${usuarioActivoId}/estado`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'inactivo' })
      .expect(200);

    expect(response.body.message).toBe(
      'Estado del usuario actualizado correctamente',
    );
    expect(response.body.data.id).toBe(usuarioActivoId);
    expect(response.body.data.estado).toBe('inactivo');
  });

  it('admin cambia estado de inactivo a activo -> 200', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .patch(`/usuarios/${usuarioInactivoId}/estado`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'ACTIVO' })
      .expect(200);

    expect(response.body.message).toBe(
      'Estado del usuario actualizado correctamente',
    );
    expect(response.body.data.id).toBe(usuarioInactivoId);
    expect(response.body.data.estado).toBe('activo');
  });

  it('usuario inexistente -> 404 USER_NOT_FOUND', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .patch('/usuarios/99999999/estado')
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'inactivo' })
      .expect(404);

    expect(response.body.code).toBe('USER_NOT_FOUND');
  });

  it('estado inválido -> 400', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .patch(`/usuarios/${usuarioActivoId}/estado`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'bloqueado' })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('usuario no admin -> 403', async () => {
    const token = generateTestToken(
      { sub: 2, email: 'ciudadano@alertify.com', roles: ['ciudadano'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .patch(`/usuarios/${usuarioActivoId}/estado`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'inactivo' })
      .expect(403);

    expect(response.body.code).toBe('AUTH_INSUFFICIENT_ROLE');
  });

  it('no expone campos sensibles en la respuesta', async () => {
    const token = generateTestToken(
      { sub: 1, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .patch(`/usuarios/${usuarioActivoId}/estado`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'inactivo' })
      .expect(200);

    expect(response.body.data).not.toHaveProperty('password_hash');
    expect(response.body.data).not.toHaveProperty('refresh_token_hash');
    expect(response.body.data).not.toHaveProperty('refresh_token_expires_at');
  });
});
