import { IsString, MaxLength, IsOptional, IsEmail, IsPhoneNumber } from 'class-validator';

export class ActualizarClienteDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellidoPaterno?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellidoMaterno?: string;

  @IsOptional()
  @IsPhoneNumber('MX')
  telefono?: string;

  @IsOptional()
  @IsEmail()
  correo?: string;
}
