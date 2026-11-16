import { IsEnum, IsNumberString, IsObject, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { TipoMovimiento } from '../../entities/movimiento-caja.entity';

export class CrearMovimientoCajaDto {
  @IsEnum(TipoMovimiento)
  tipoMovimiento: TipoMovimiento;

  /** Código de moneda. Si no se manda, MXN. La reposición siempre es en MXN. */
  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda?: string;

  @IsNumberString()
  monto: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  concepto?: string;

  /** Solo USD: billetes por denominación { "100": 4, "50": 2 }. Deben sumar el monto. */
  @IsOptional()
  @IsObject()
  billetes?: Record<string, number>;
}
