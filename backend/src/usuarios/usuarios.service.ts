import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Usuarios } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FindUsuariosQueryDto } from './dto/find-usuarios-query.dto';
import { UpdateUsuarioEstadoDto } from './dto/update-usuario-estado.dto';
import { UpdateUsuarioRolDto } from './dto/update-usuario-rol.dto';

export interface UsuarioListItem {
  id: number;
  email: string;
  username: string;
  estado: string;
  roles: string[];
  created_at: Date;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedUsuariosResponse {
  data: UsuarioListItem[];
  meta: PaginationMeta;
}

export interface UsuarioEstadoItem {
  id: number;
  email: string;
  username: string;
  estado: string;
  roles: string[];
}

export interface UpdateUsuarioEstadoResponse {
  message: string;
  data: UsuarioEstadoItem;
}

export interface UpdateUsuarioRolResponse {
  message: string;
  data: UsuarioEstadoItem;
}

const normalizeRoleForResponse = (roleName: string): string => {
  const normalized = roleName.toLowerCase().trim();

  if (normalized === 'administrador') {
    return 'admin';
  }

  return normalized;
};

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<Usuarios | null> {
    return this.prisma.usuarios.findUnique({
      where: { email },
    });
  }

  async findByUsername(username: string): Promise<Usuarios | null> {
    return this.prisma.usuarios.findUnique({
      where: { username },
    });
  }

  async findByIdWithRoles(
    id: number,
  ): Promise<
    (Usuarios & { user_roles: { rol: { nombre: string } }[] }) | null
  > {
    return this.prisma.usuarios.findUnique({
      where: { id },
      include: {
        user_roles: {
          include: {
            rol: true,
          },
        },
      },
    });
  }

  async findByEmailWithRoles(
    email: string,
  ): Promise<
    (Usuarios & { user_roles: { rol: { nombre: string } }[] }) | null
  > {
    return this.prisma.usuarios.findUnique({
      where: { email },
      include: {
        user_roles: {
          include: {
            rol: true,
          },
        },
      },
    });
  }

  async findAllPaginated(
    query: FindUsuariosQueryDto,
  ): Promise<PaginatedUsuariosResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const estado = query.estado?.trim().toLowerCase();
    const rol = query.rol?.trim().toLowerCase();
    const rawSearch = query.search?.trim();
    const search = rawSearch && rawSearch.length > 0 ? rawSearch : undefined;

    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.UsuariosWhereInput = {};

    if (estado) {
      where.estado = {
        in: [estado, estado.toUpperCase(), estado[0].toUpperCase() + estado.slice(1)],
      };
    }

    if (rol) {
      const roleCandidates = new Set<string>([
        rol,
        rol.toUpperCase(),
        rol[0].toUpperCase() + rol.slice(1),
      ]);

      // Normalizar alias comunes para robustecer el filtro en bases existentes.
      if (rol === 'admin' || rol === 'administrador') {
        roleCandidates.add('admin');
        roleCandidates.add('ADMIN');
        roleCandidates.add('administrador');
        roleCandidates.add('ADMINISTRADOR');
      }
      if (rol === 'ciudadano') {
        roleCandidates.add('ciudadano');
        roleCandidates.add('CIUDADANO');
      }

      where.user_roles = {
        some: {
          rol: {
            nombre: {
              in: Array.from(roleCandidates),
            },
          },
        },
      };
    }

    if (search) {
      where.OR = [
        {
          username: {
            contains: search,
          },
        },
        {
          email: {
            contains: search,
          },
        },
      ];
    }

    const [usuarios, total] = await this.prisma.$transaction([
      this.prisma.usuarios.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { created_at: 'desc' },
        include: {
          user_roles: {
            include: { rol: true },
          },
        },
      }),
      this.prisma.usuarios.count({ where }),
    ]);

    const data: UsuarioListItem[] = usuarios.map((usuario) => ({
      id: usuario.id,
      email: usuario.email,
      username: usuario.username,
      estado: usuario.estado,
      created_at: usuario.created_at,
      roles: usuario.user_roles
        .map((ur) => ur.rol.nombre.toLowerCase().trim())
        .filter((role) => role.length > 0),
    }));

    const totalPages = Math.ceil(total / safeLimit);

    return {
      data,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },
    };
  }

  async updateEstado(
    id: number,
    dto: UpdateUsuarioEstadoDto,
  ): Promise<UpdateUsuarioEstadoResponse> {
    const estado = dto.estado.trim().toLowerCase();

    try {
      const usuario = await this.prisma.usuarios.update({
        where: { id },
        data: { estado },
        include: {
          user_roles: {
            include: {
              rol: true,
            },
          },
        },
      });

      return {
        message: 'Estado del usuario actualizado correctamente',
        data: {
          id: usuario.id,
          email: usuario.email,
          username: usuario.username,
          estado: usuario.estado,
          roles: usuario.user_roles
            .map((ur) => ur.rol.nombre.toLowerCase().trim())
            .filter((role) => role.length > 0),
        },
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException({
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND',
        });
      }

      throw error;
    }
  }

  async updateRol(
    id: number,
    dto: UpdateUsuarioRolDto,
    actor: { sub: number; roles: string[] },
  ): Promise<UpdateUsuarioRolResponse> {
    const nuevoRol = dto.rol.trim().toLowerCase();

    return this.prisma.$transaction(async (tx) => {
      const target = await tx.usuarios.findUnique({
        where: { id },
        include: {
          user_roles: {
            include: {
              rol: true,
            },
          },
        },
      });

      if (!target) {
        throw new NotFoundException({
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND',
        });
      }

      const exactRoleCandidates = [
        nuevoRol,
        nuevoRol.toUpperCase(),
        nuevoRol[0].toUpperCase() + nuevoRol.slice(1),
      ];

      let rolDestino = await tx.roles.findFirst({
        where: {
          nombre: {
            in: exactRoleCandidates,
          },
        },
      });

      if (!rolDestino && nuevoRol === 'admin') {
        rolDestino = await tx.roles.findFirst({
          where: {
            nombre: {
              in: ['administrador', 'ADMINISTRADOR', 'Administrador'],
            },
          },
        });
      }

      if (!rolDestino) {
        throw new BadRequestException({
          message: 'Rol inválido',
          code: 'ROLE_INVALID',
        });
      }

      const currentRoles = target.user_roles
        .map((ur) => ur.rol.nombre.toLowerCase().trim())
        .filter((role) => role.length > 0);
      const isTargetAdmin = currentRoles.some((role) =>
        ['admin', 'administrador'].includes(role),
      );
      const isDemotingAdmin = isTargetAdmin && nuevoRol !== 'admin';
      const isSelfUpdate = actor.sub === id;

      if (isDemotingAdmin) {
        const adminCount = await tx.usuarios.count({
          where: {
            user_roles: {
              some: {
                rol: {
                  nombre: {
                    in: ['admin', 'ADMIN', 'administrador', 'ADMINISTRADOR'],
                  },
                },
              },
            },
          },
        });

        if (adminCount <= 1) {
          throw new ForbiddenException({
            message: isSelfUpdate
              ? 'No se puede auto-remover el último administrador del sistema.'
              : 'No se puede remover el último administrador del sistema.',
            code: 'LAST_ADMIN_FORBIDDEN',
          });
        }
      }

      await tx.userRoles.deleteMany({
        where: {
          user_id: id,
        },
      });

      await tx.userRoles.create({
        data: {
          user_id: id,
          role_id: rolDestino.id,
        },
      });

      const updated = await tx.usuarios.findUnique({
        where: { id },
        include: {
          user_roles: {
            include: {
              rol: true,
            },
          },
        },
      });

      if (!updated) {
        throw new NotFoundException({
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND',
        });
      }

      return {
        message: 'Rol del usuario actualizado correctamente',
        data: {
          id: updated.id,
          email: updated.email,
          username: updated.username,
          estado: updated.estado,
          roles: updated.user_roles
            .map((ur) => normalizeRoleForResponse(ur.rol.nombre))
            .filter((role) => role.length > 0),
        },
      };
    });
  }

  // Eliminado: createUsuario() - no se utiliza, la transacción se maneja en AuthService
}
