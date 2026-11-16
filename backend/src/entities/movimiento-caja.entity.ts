import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  type Relation,
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
  corte: Relation<CorteCaja>;

  @ManyToOne(() => Usuario, (usuario) => usuario.movimientosCaja)
  @JoinColumn({ name: 'id_usuario' })
  usuario: Relation<Usuario>;

  @Column({ name: 'tipo_movimiento', type: 'enum', enum: TipoMovimiento })
  tipoMovimiento: TipoMovimiento;

  @Column({ length: 3, default: 'MXN' })
  moneda: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  monto: string;

  @Column({ length: 255, nullable: true })
  concepto: string;

  // Solo USD: billetes por denominación que entraron o salieron { "100": 4, "50": 2 }.
  @Column({ type: 'json', nullable: true })
  billetes: Record<string, number> | null;

  @CreateDateColumn({ name: 'fecha_hora' })
  fechaHora: Date;
}
