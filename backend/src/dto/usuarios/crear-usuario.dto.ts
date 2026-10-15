import { IsInt, IsString, MaxLength, MinLength, IsOptional } from 'class-validator';

export class CrearUsuarioDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @MaxLength(100)
  apellidoPaterno: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellidoMaterno?: string;

  @IsString()
  @MaxLength(50)
  usuario: string;

  // Contraseña en texto plano solo en este DTO de entrada; el service
  // la hashea antes de guardar. Nunca se persiste ni se loguea tal cual.
  @IsString()
  @MinLength(8)
  contrasena: string;

  @IsInt()
  idRol: number;
}
