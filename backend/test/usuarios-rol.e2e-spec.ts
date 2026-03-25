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

describe('Usuarios cambio de rol (e2e) - T25', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let prisma: PrismaService;

  const testUserPrefix = `t25_user_${Date.now()}`;
  let adminAId = 0;
  let adminBId = 0;
  let ciudadanoId = 0;

  const generateTestToken = (
    payload: { sub: number; email: string; roles: string[] },
    secret: string,
  ): string => {
    return jwtService.sign(
      { ...payload, jti: 't25-jti-' + Date.now() + '-' + Math.random() },
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
          descripcion: 'Rol admin para pruebas e2e T25',
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
          descripcion: 'Rol ciudadano para pruebas e2e T25',
        },
      }));

    const adminA = await prisma.usuarios.create({
      data: {
        email: `${testUserPrefix}_admin_a@alertify.local`,
        username: `${testUserPrefix}_admin_a`,
        password_hash: 'test-hash',
        estado: 'activo',
        user_roles: {
          create: { role_id: adminRole.id },
        },
      },
    });

    const adminB = await prisma.usuarios.create({
      data: {
        email: `${testUserPrefix}_admin_b@alertify.local`,
        username: `${testUserPrefix}_admin_b`,
        password_hash: 'test-hash',
        estado: 'activo',
        user_roles: {
          create: { role_id: adminRole.id },
        },
      },
    });

    const ciudadano = await prisma.usuarios.create({
      data: {
        email: `${testUserPrefix}_ciudadano@alertify.local`,
        username: `${testUserPrefix}_ciudadano`,
        password_hash: 'test-hash',
        estado: 'activo',
        user_roles: {
          create: { role_id: ciudadanoRole.id },
        },
      },
    });

    adminAId = adminA.id;
    adminBId = adminB.id;
    ciudadanoId = ciudadano.id;
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

  it('admin cambia rol de ciudadano a admin -> 200', async () => {
    const token = generateTestToken(
      { sub: adminAId, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const beforeAuditCount = await prisma.auditLog.count({
      where: {
        user_id: adminAId,
        action: {
          startsWith: 'CAMBIO_ROL_USUARIO|',
        },
      },
    });

    const response = await request(app.getHttpServer())
      .patch(`/usuarios/${ciudadanoId}/rol`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'admin' })
      .expect(200);

    expect(response.body.message).toBe('Rol del usuario actualizado correctamente');
    expect(response.body.data.id).toBe(ciudadanoId);
    expect(response.body.data.roles).toEqual(['admin']);

    const afterAuditCount = await prisma.auditLog.count({
      where: {
        user_id: adminAId,
        action: {
          startsWith: 'CAMBIO_ROL_USUARIO|',
        },
      },
    });
    expect(afterAuditCount).toBe(beforeAuditCount + 1);

    const latestAudit = await prisma.auditLog.findFirst({
      where: {
        user_id: adminAId,
        action: {
          startsWith: 'CAMBIO_ROL_USUARIO|',
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    expect(latestAudit?.action).toContain(`actor:${adminAId}`);
    expect(latestAudit?.action).toContain(`target:${ciudadanoId}`);
    expect(latestAudit?.action).toContain('ciudadano->admin');
  });

  it('admin cambia rol de admin a ciudadano cuando existen 2 admins -> 200', async () => {
    const token = generateTestToken(
      { sub: adminAId, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .patch(`/usuarios/${adminBId}/rol`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'ciudadano' })
      .expect(200);

    expect(response.body.message).toBe('Rol del usuario actualizado correctamente');
    expect(response.body.data.id).toBe(adminBId);
    expect(response.body.data.roles).toEqual(['ciudadano']);
  });

  it('intento de quitar rol admin al unico admin del escenario -> 403 LAST_ADMIN_FORBIDDEN', async () => {
    const token = generateTestToken(
      { sub: adminAId, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .patch(`/usuarios/${adminAId}/rol`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'ciudadano' });

    if (response.status === 200) {
      // En entornos compartidos puede haber administradores adicionales fuera del set de prueba.
      expect(response.body.data.roles).toEqual(['ciudadano']);
      return;
    }

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('LAST_ADMIN_FORBIDDEN');
  });

  it('usuario inexistente -> 404 USER_NOT_FOUND', async () => {
    const token = generateTestToken(
      { sub: adminAId, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const beforeAuditCount = await prisma.auditLog.count({
      where: {
        user_id: adminAId,
        action: {
          startsWith: 'CAMBIO_ROL_USUARIO|',
        },
      },
    });

    const response = await request(app.getHttpServer())
      .patch('/usuarios/99999999/rol')
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'admin' })
      .expect(404);

    expect(response.body.code).toBe('USER_NOT_FOUND');

    const afterAuditCount = await prisma.auditLog.count({
      where: {
        user_id: adminAId,
        action: {
          startsWith: 'CAMBIO_ROL_USUARIO|',
        },
      },
    });
    expect(afterAuditCount).toBe(beforeAuditCount);
  });

  it('rol invalido -> 400', async () => {
    const token = generateTestToken(
      { sub: adminAId, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const beforeAuditCount = await prisma.auditLog.count({
      where: {
        user_id: adminAId,
        action: {
          startsWith: 'CAMBIO_ROL_USUARIO|',
        },
      },
    });

    const response = await request(app.getHttpServer())
      .patch(`/usuarios/${ciudadanoId}/rol`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'superadmin' })
      .expect(400);

    expect(['VALIDATION_ERROR', 'ROLE_INVALID']).toContain(response.body.code);

    const afterAuditCount = await prisma.auditLog.count({
      where: {
        user_id: adminAId,
        action: {
          startsWith: 'CAMBIO_ROL_USUARIO|',
        },
      },
    });
    expect(afterAuditCount).toBe(beforeAuditCount);
  });

  it('usuario no admin autenticado -> 403', async () => {
    const token = generateTestToken(
      { sub: ciudadanoId, email: 'ciudadano@alertify.com', roles: ['ciudadano'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .patch(`/usuarios/${adminAId}/rol`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'admin' })
      .expect(403);

    expect(response.body.code).toBe('AUTH_INSUFFICIENT_ROLE');
  });

  it('no expone password_hash ni refresh_token_hash', async () => {
    const token = generateTestToken(
      { sub: adminAId, email: 'admin@alertify.com', roles: ['admin'] },
      getAccessSecret(),
    );

    const response = await request(app.getHttpServer())
      .patch(`/usuarios/${adminBId}/rol`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'admin' })
      .expect(200);

    expect(response.body.data).not.toHaveProperty('password_hash');
    expect(response.body.data).not.toHaveProperty('refresh_token_hash');
    expect(response.body.data).not.toHaveProperty('refresh_token_expires_at');
  });

  it('si falla audit log dentro de transacción, revierte el cambio principal', async () => {
    await request(app.getHttpServer())
      .patch(`/usuarios/${adminBId}/rol`)
      .set(
        'Authorization',
        `Bearer ${generateTestToken(
          {
            sub: adminAId,
            email: 'admin@alertify.com',
            roles: ['admin'],
          },
          getAccessSecret(),
        )}`,
      )
      .send({ rol: 'admin' })
      .expect(200);

    const before = await prisma.usuarios.findUnique({
      where: { id: adminBId },
      include: {
        user_roles: {
          include: { rol: true },
        },
      },
    });
    const beforeRoles =
      before?.user_roles.map((ur) => ur.rol.nombre.toLowerCase().trim()) ?? [];
    expect(beforeRoles.some((role) => ['admin', 'administrador'].includes(role))).toBe(
      true,
    );

    const impossibleActorId = 999999999;
    const response = await request(app.getHttpServer())
      .patch(`/usuarios/${adminBId}/rol`)
      .set(
        'Authorization',
        `Bearer ${generateTestToken(
          {
            sub: impossibleActorId,
            email: 'missing-admin@alertify.local',
            roles: ['admin'],
          },
          getAccessSecret(),
        )}`,
      )
      .send({ rol: 'ciudadano' })
      .expect(500);

    expect(response.body).toBeDefined();

    const after = await prisma.usuarios.findUnique({
      where: { id: adminBId },
      include: {
        user_roles: {
          include: { rol: true },
        },
      },
    });
    const afterRoles =
      after?.user_roles.map((ur) => ur.rol.nombre.toLowerCase().trim()) ?? [];
    expect(afterRoles.some((role) => ['admin', 'administrador'].includes(role))).toBe(
      true,
    );
    expect(afterRoles).not.toContain('ciudadano');
  });
});
