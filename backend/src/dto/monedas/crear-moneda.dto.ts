import { IsOptional, IsString, Length } from 'class-validator';

export class CrearMonedaDto {
  @IsString()
  @Length(3, 3)
  codigo: string; // USD, EUR...

  @IsString()
  @Length(1, 50)
  nombre: string;

  // Opcional: si no se manda, se usa el código (ej. "GBP").
  @IsOptional()
  @IsString()
  @Length(1, 5)
  simbolo?: string;
}
