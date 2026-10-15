import { IsNumberString } from 'class-validator';

export class AbrirCorteDto {
  @IsNumberString()
  efectivoInicial: string;
}
