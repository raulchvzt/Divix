import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { CorteCaja } from './corte-caja.entity';
import { Usuario } from './usuario.entity';

export enum TipoMovimiento {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  // Traslado de pesos de la caja fuerte a la caja del cajero (no cambia el total).
  REPOSICION = 'reposicion',
}

@Entity('MovimientosCaja')
export class MovimientoCaja {
  @PrimaryGeneratedColumn({ name: 'id_movimiento' })
  id: number;

  @ManyToOne(() => CorteCaja, (corte) => corte.movimientos)
  @JoinColumn({ name: 'id_corte' })
  corte: CorteCaja;

  @ManyToOne(() => Usuario, (usuario) => usuario.movimientosCaja)
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ name: 'tipo_movimiento', type: 'enum', enum: TipoMovimiento })
  tipoMovimiento: TipoMovimiento;

  @Column({ length: 3, default: 'MXN' })
  moneda: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  monto: string;

  @Column({ length: 255, nullable: true })
  concepto: string;

  @CreateDateColumn({ name: 'fecha_hora' })
  fechaHora: Date;
}
