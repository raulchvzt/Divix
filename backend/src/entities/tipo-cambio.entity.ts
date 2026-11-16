import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
  Index,
  type Relation,
} from 'typeorm';
import { Moneda } from './moneda.entity';
import { Usuario } from './usuario.entity';
import { Operacion } from './operacion.entity';

// Histórico: cada cambio de tipo de cambio es un INSERT nuevo, nunca un UPDATE.
@Entity('TiposCambio')
@Index(['moneda', 'fechaVigencia'])
export class TipoCambio {
  @PrimaryGeneratedColumn({ name: 'id_tipo_cambio' })
  id: number;

  @ManyToOne(() => Moneda, (moneda) => moneda.tiposCambio)
  @JoinColumn({ name: 'id_moneda' })
  moneda: Relation<Moneda>;

  @Column({ name: 'tipo_cambio_compra', type: 'decimal', precision: 15, scale: 4 })
  tipoCambioCompra: string; // decimal en TypeORM llega como string; convertir al usarlo

  @Column({ name: 'tipo_cambio_venta', type: 'decimal', precision: 15, scale: 4 })
  tipoCambioVenta: string;

  @CreateDateColumn({ name: 'fecha_vigencia' })
  fechaVigencia: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.tiposCambioRegistrados)
  @JoinColumn({ name: 'id_usuario' })
  usuario: Relation<Usuario>;

  @OneToMany(() => Operacion, (op) => op.tipoCambio)
  operaciones: Operacion[];
}
