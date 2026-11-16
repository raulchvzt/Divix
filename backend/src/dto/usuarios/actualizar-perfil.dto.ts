import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Lo que cada usuario puede cambiar de su propio perfil.
 * Nombre, apellidos y correo solo los cambia el administrador (lo revisa el service).
 */
export class ActualizarPerfilDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  apellidoPaterno?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellidoMaterno?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(150)
  correo?: string;

  // data URL de la imagen; null la quita. El navegador la reduce a 256 px.
  @IsOptional()
  @IsString()
  @MaxLength(90_000, { message: 'La foto es demasiado grande' })
  @Matches(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, {
    message: 'La foto debe ser una imagen JPG, PNG o WebP',
  })
  foto?: string | null;
}
