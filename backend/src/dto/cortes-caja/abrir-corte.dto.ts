import { IsNumberString, IsObject, IsOptional } from 'class-validator';

export class AbrirCorteDto {
  /** Pesos (MXN) en la caja del cajero. */
  @IsNumberString()
  efectivoInicial: string;

  /** Pesos (MXN) en la caja fuerte. */
  @IsOptional()
  @IsNumberString()
  reservaInicial?: string;

  /** Saldo inicial de las demás monedas: { USD: "1200", CAD: "0" }. */
  @IsOptional()
  @IsObject()
  saldosIniciales?: Record<string, string>;

  /** Solo USD: billetes por denominación { "100": 4, "50": 2 }. Deben sumar el saldo inicial de USD. */
  @IsOptional()
  @IsObject()
  billetesIniciales?: Record<string, number>;
}
