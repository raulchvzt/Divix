import { IsInt, IsNumberString } from 'class-validator';

// Se usa IsNumberString porque los decimales viajan como string
// (evita errores de redondeo en floats de JS); el service valida que
// sean positivos y los convierte con decimal.js antes de guardar.
export class CrearTipoCambioDto {
  @IsInt()
  idMoneda: number;

  @IsNumberString()
  tipoCambioCompra: string;

  @IsNumberString()
  tipoCambioVenta: string;
}
