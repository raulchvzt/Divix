import { IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class ActualizarRolDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nombreRol?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
