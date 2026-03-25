import { Injectable } from '@nestjs/common';
import { Prisma, Usuarios } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FindUsuariosQueryDto } from './dto/find-usuarios-query.dto';

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

  // Eliminado: createUsuario() - no se utiliza, la transacción se maneja en AuthService
}
