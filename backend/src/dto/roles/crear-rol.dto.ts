import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CrearRolDto {
  @IsString()
  @MaxLength(50)
  nombreRol: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;
}
