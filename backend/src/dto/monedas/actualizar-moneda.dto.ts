import { IsString, Length, IsOptional } from 'class-validator';

export class ActualizarMonedaDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5)
  simbolo?: string;
}
