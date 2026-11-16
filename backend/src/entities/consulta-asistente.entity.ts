import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  type Relation,
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
  usuario: Relation<Usuario>;

  // Agrupa las preguntas de una misma conversación (UUID generado al iniciarla).
  // Nulo en las consultas anteriores a que existieran las conversaciones.
  @Column({ name: 'id_conversacion', type: 'varchar', length: 36, nullable: true })
  @Index()
  idConversacion: string | null;

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
