import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateUsuarioRolDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\s*(admin|ciudadano)\s*$/i, {
    message: 'rol debe ser admin o ciudadano',
  })
  rol!: string;
}