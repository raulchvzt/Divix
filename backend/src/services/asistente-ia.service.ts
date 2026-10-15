import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { ConsultaAsistente, TipoConsulta } from '../entities/consulta-asistente.entity';
import { ConsultarAsistenteDto } from '../dto/asistente-ia/consultar-asistente.dto';
import { TiposCambioService } from './tipos-cambio.service';

@Injectable()
export class AsistenteIaService {
  private readonly client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  constructor(
    @InjectRepository(ConsultaAsistente)
    private readonly consultasRepo: Repository<ConsultaAsistente>,
    private readonly tiposCambioService: TiposCambioService,
  ) {}

  async consultar(dto: ConsultarAsistenteDto, idUsuario: number) {
    const inicio = Date.now();

    // Contexto real del negocio para que la IA no "invente" cifras:
    // le pasamos los tipos de cambio vigentes como datos de apoyo.
    const tiposCambioVigentes = await this.tiposCambioService.actual();

    let respuestaTexto: string;
    try {
      const mensaje = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system:
          'Eres un asistente para una casa de cambio. Respondes de forma breve y clara. ' +
          'Cuando hables de tendencias de tipo de cambio, deja explícito que es una ' +
          'orientación informativa y no una garantía ni una recomendación financiera formal.',
        messages: [
          {
            role: 'user',
            content: `Tipos de cambio vigentes: ${JSON.stringify(tiposCambioVigentes)}\n\nPregunta del usuario: ${dto.pregunta}`,
          },
        ],
      });

      const bloqueTexto = mensaje.content.find((b) => b.type === 'text');
      respuestaTexto = bloqueTexto?.type === 'text' ? bloqueTexto.text : '';
    } catch (error) {
      throw new InternalServerErrorException('El asistente no pudo procesar la consulta');
    }

    const tiempoRespuestaMs = Date.now() - inicio;

    const registro = this.consultasRepo.create({
      usuario: { id: idUsuario } as any,
      pregunta: dto.pregunta,
      respuesta: respuestaTexto,
      tipoConsulta: dto.tipoConsulta ?? TipoConsulta.ADMINISTRATIVA,
      tiempoRespuestaMs,
    });

    await this.consultasRepo.save(registro);

    return { respuesta: respuestaTexto, tiempoRespuestaMs };
  }

  async historialPorUsuario(idUsuario: number) {
    return this.consultasRepo.find({
      where: { usuario: { id: idUsuario } },
      order: { fechaHora: 'DESC' },
    });
  }

  async historialCompleto() {
    return this.consultasRepo.find({
      relations: { usuario: true },
      order: { fechaHora: 'DESC' },
    });
  }
}
