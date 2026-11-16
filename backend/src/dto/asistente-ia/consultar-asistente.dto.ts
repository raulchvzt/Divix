import { IsString, MinLength, MaxLength, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TipoConsulta } from '../../entities/consulta-asistente.entity';

export class ConsultarAsistenteDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  pregunta: string;

  // Si se manda, la pregunta continúa esa conversación (el asistente recuerda lo anterior).
  @IsOptional()
  @IsUUID()
  idConversacion?: string;

  @IsOptional()
  @IsEnum(TipoConsulta)
  tipoConsulta?: TipoConsulta;
}
