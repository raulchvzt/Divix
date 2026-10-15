import { IsString, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @IsString()
  contrasenaActual: string;

  @IsString()
  @MinLength(8)
  contrasenaNueva: string;
}
