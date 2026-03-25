import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateUsuarioEstadoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\s*(activo|inactivo)\s*$/i, {
    message: 'estado debe ser activo o inactivo',
  })
  estado!: string;
}