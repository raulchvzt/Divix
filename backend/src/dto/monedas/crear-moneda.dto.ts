import { IsString, Length } from 'class-validator';

export class CrearMonedaDto {
  @IsString()
  @Length(3, 3)
  codigo: string; // USD, EUR...

  @IsString()
  @Length(1, 50)
  nombre: string;

  @IsString()
  @Length(1, 5)
  simbolo: string;
}
