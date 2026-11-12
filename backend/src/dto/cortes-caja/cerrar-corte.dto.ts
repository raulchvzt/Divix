import { IsNumberString, IsObject, IsOptional } from 'class-validator';

// Lo que el cajero CONTÓ. Las diferencias, totales y saldos esperados los
// calcula el service; nunca se reciben del cliente.
export class CerrarCorteDto {
  /** Pesos (MXN) contados en la caja del cajero. */
  @IsNumberString()
  efectivoFinal: string;

  /** Pesos (MXN) contados en la caja fuerte. Si no se manda, se toma el esperado. */
  @IsOptional()
  @IsNumberString()
  reservaFinal?: string;

  /** Conteo de las demás monedas: { USD: "1200" }. Las que falten se toman como esperadas. */
  @IsOptional()
  @IsObject()
  saldosFinales?: Record<string, string>;

  /** Solo USD: billetes por denominación { "100": 4, "50": 2 }. Deben sumar el USD contado. */
  @IsOptional()
  @IsObject()
  billetesFinales?: Record<string, number>;
}
