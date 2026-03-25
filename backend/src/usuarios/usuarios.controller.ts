import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import {
  PaginatedUsuariosResponse,
  UsuariosService,
} from './usuarios.service';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles('admin')
  async findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedUsuariosResponse> {
    return this.usuariosService.findAllPaginated(query.page, query.limit);
  }
}
