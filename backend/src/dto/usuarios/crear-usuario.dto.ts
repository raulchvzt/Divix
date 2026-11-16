import { IsEmail, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CrearUsuarioDto {
  // Puede ser el nombre completo ("Mariana Ríos Pérez"); si no se mandan
  // los apellidos, el service lo separa.
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellidoPaterno?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellidoMaterno?: string;

  @IsEmail()
  @MaxLength(150)
  correo: string;

  // Nombre para iniciar sesión. Si no se manda, se usa el correo.
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  usuario?: string;

  // Si no se manda, el sistema genera una contraseña temporal y la devuelve una sola vez.
  @IsOptional()
  @IsString()
  @MinLength(8)
  contrasena?: string;

  @IsInt()
  idRol: number;
}
