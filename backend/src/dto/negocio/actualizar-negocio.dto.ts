import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ActualizarNegocioDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rfc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  // Se permite vacío para borrar el correo.
  @IsOptional()
  @ValidateIf((_, v) => v !== '')
  @IsEmail()
  @MaxLength(150)
  correo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;

  @IsOptional()
  @Matches(HORA, { message: 'horaApertura debe tener formato HH:MM' })
  horaApertura?: string;

  @IsOptional()
  @Matches(HORA, { message: 'horaCierre debe tener formato HH:MM' })
  horaCierre?: string;
}
