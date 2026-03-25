import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FindUsuariosQueryDto } from './dto/find-usuarios-query.dto';
import { UpdateUsuarioEstadoDto } from './dto/update-usuario-estado.dto';
import { UpdateUsuarioRolDto } from './dto/update-usuario-rol.dto';
import {
  PaginatedUsuariosResponse,
  UpdateUsuarioRolResponse,
  UpdateUsuarioEstadoResponse,
  UsuariosService,
} from './usuarios.service';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles('admin')
  async findAll(
    @Query() query: FindUsuariosQueryDto,
  ): Promise<PaginatedUsuariosResponse> {
    return this.usuariosService.findAllPaginated(query);
  }

  @Patch(':id/estado')
  @Roles('admin')
  async updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioEstadoDto,
  ): Promise<UpdateUsuarioEstadoResponse> {
    return this.usuariosService.updateEstado(id, dto);
  }

  @Patch(':id/rol')
  @Roles('admin')
  async updateRol(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioRolDto,
    @Req() req: Request,
  ): Promise<UpdateUsuarioRolResponse> {
    const actor = req.user as { sub: number; roles: string[] };
    return this.usuariosService.updateRol(id, dto, actor);
  }
}
