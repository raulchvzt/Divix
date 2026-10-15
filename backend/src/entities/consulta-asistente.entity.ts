import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Usuario } from './usuario.entity';

export enum TipoConsulta {
  ADMINISTRATIVA = 'administrativa',
  TENDENCIA = 'tendencia',
}

@Entity('ConsultasAsistente')
@Index(['fechaHora'])
export class ConsultaAsistente {
  @PrimaryGeneratedColumn({ name: 'id_consulta' })
  id: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.consultasAsistente)
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ type: 'text' })
  pregunta: string;

  @Column({ type: 'text' })
  respuesta: string;

  @Column({ name: 'tipo_consulta', type: 'enum', enum: TipoConsulta })
  tipoConsulta: TipoConsulta;

  @CreateDateColumn({ name: 'fecha_hora' })
  fechaHora: Date;

  @Column({ name: 'tiempo_respuesta_ms', type: 'int', nullable: true })
  tiempoRespuestaMs: number | null;
}
