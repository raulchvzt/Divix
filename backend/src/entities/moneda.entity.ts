import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { TipoCambio } from './tipo-cambio.entity';
import { Operacion } from './operacion.entity';

@Entity('Monedas')
export class Moneda {
  @PrimaryGeneratedColumn({ name: 'id_moneda' })
  id: number;

  @Column({ length: 3, unique: true })
  codigo: string; // USD, EUR, etc.

  @Column({ length: 50 })
  nombre: string;

  @Column({ length: 5 })
  simbolo: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => TipoCambio, (tc) => tc.moneda)
  tiposCambio: TipoCambio[];

  @OneToMany(() => Operacion, (op) => op.moneda)
  operaciones: Operacion[];
}
