import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FindUsuariosQueryDto } from './dto/find-usuarios-query.dto';
import { UpdateUsuarioEstadoDto } from './dto/update-usuario-estado.dto';
import {
  PaginatedUsuariosResponse,
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
}
