import { IsNumberString, IsObject, IsOptional } from 'class-validator';

// Corrección de una operación ya registrada (solo administrador, turno abierto).
// Aquí sí se recibe el tipo de cambio porque es justo lo que se corrige.
export class ModificarOperacionDto {
  @IsNumberString()
  cantidadDivisa: string;

  @IsNumberString()
  tipoCambioAplicado: string;

  /** Solo USD: billetes por denominación { "100": 4, "50": 2 }. Deben sumar la cantidad. */
  @IsOptional()
  @IsObject()
  billetes?: Record<string, number>;
}
