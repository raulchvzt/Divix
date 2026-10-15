import { IsNumberString } from 'class-validator';

// total_compras, total_ventas y diferencia_caja NO van en este DTO:
// el service los calcula a partir de Operaciones y MovimientosCaja
// del corte, nunca se reciben del cliente.
export class CerrarCorteDto {
  @IsNumberString()
  efectivoFinal: string;
}
