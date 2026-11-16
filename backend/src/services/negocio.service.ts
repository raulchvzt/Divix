import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionNegocio } from '../entities/configuracion-negocio.entity';
import { ActualizarNegocioDto } from '../dto/negocio/actualizar-negocio.dto';

@Injectable()
export class NegocioService {
  constructor(
    @InjectRepository(ConfiguracionNegocio)
    private readonly repo: Repository<ConfiguracionNegocio>,
  ) {}

  /** Devuelve la configuración; si aún no existe, crea la fila inicial. */
  async obtener() {
    const existente = await this.repo.findOne({ where: { id: 1 } });
    if (existente) return existente;
    return this.repo.save(
      this.repo.create({
        id: 1,
        nombre: 'Casa de Cambio Divix',
        rfc: '',
        telefono: '',
        correo: '',
        direccion: '',
        horaApertura: '09:00',
        horaCierre: '18:00',
      }),
    );
  }

  async actualizar(dto: ActualizarNegocioDto) {
    const actual = await this.obtener();
    Object.assign(actual, dto);
    return this.repo.save(actual);
  }
}
