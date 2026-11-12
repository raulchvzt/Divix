import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Cliente } from './cliente.entity';
import { Usuario } from './usuario.entity';
import { Moneda } from './moneda.entity';
import { TipoCambio } from './tipo-cambio.entity';

export enum TipoOperacion {
  COMPRA = 'compra',
  VENTA = 'venta',
}

// importe_total y tipo_cambio_aplicado son SNAPSHOT histórico: se calculan
// una sola vez al crear el registro (en el service), nunca se recalculan
// ni se aceptan directamente desde el cliente/frontend.
@Entity('Operaciones')
@Index(['fechaHora'])
@Index(['cliente'])
export class Operacion {
  @PrimaryGeneratedColumn({ name: 'id_operacion' })
  id: number;

  @ManyToOne(() => Cliente, (cliente) => cliente.operaciones)
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;

  @ManyToOne(() => Usuario, (usuario) => usuario.operaciones)
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @ManyToOne(() => Moneda, (moneda) => moneda.operaciones)
  @JoinColumn({ name: 'id_moneda' })
  moneda: Moneda;

  @ManyToOne(() => TipoCambio, (tc) => tc.operaciones)
  @JoinColumn({ name: 'id_tipo_cambio' })
  tipoCambio: TipoCambio;

  @Column({ name: 'tipo_operacion', type: 'enum', enum: TipoOperacion })
  tipoOperacion: TipoOperacion;

  @Column({ name: 'cantidad_divisa', type: 'decimal', precision: 15, scale: 4 })
  cantidadDivisa: string;

  @Column({ name: 'tipo_cambio_aplicado', type: 'decimal', precision: 15, scale: 4 })
  tipoCambioAplicado: string;

  @Column({ name: 'importe_total', type: 'decimal', precision: 15, scale: 4 })
  importeTotal: string;

  // Solo USD: billetes por denominación que entraron o salieron { "100": 4, "50": 2 }.
  @Column({ type: 'json', nullable: true })
  billetes: Record<string, number> | null;

  @CreateDateColumn({ name: 'fecha_hora' })
  fechaHora: Date;
}
