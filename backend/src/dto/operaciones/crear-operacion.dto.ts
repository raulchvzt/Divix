import { IsInt, IsEnum, IsNumberString } from 'class-validator';
import { TipoOperacion } from '../../entities/operacion.entity';

// Nota de seguridad: este DTO NO incluye tipoCambioAplicado ni
// importeTotal. Esos valores el service los calcula internamente
// a partir del tipo de cambio vigente — nunca se reciben del cliente.
export class CrearOperacionDto {
  @IsInt()
  idCliente: number;

  @IsInt()
  idMoneda: number;

  @IsEnum(TipoOperacion)
  tipoOperacion: TipoOperacion;

  @IsNumberString()
  cantidadDivisa: string;
}
