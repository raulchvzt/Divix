import { IsEnum, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoMovimiento } from '../../entities/movimiento-caja.entity';

export class CrearMovimientoCajaDto {
  @IsEnum(TipoMovimiento)
  tipoMovimiento: TipoMovimiento;

  @IsNumberString()
  monto: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  concepto?: string;
}
