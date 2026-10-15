import { IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { TipoConsulta } from '../../entities/consulta-asistente.entity';

export class ConsultarAsistenteDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  pregunta: string;

  @IsOptional()
  @IsEnum(TipoConsulta)
  tipoConsulta?: TipoConsulta;
}
