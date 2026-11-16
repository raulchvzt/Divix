import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Operacion } from './operacion.entity';

@Entity('Clientes')
export class Cliente {
  @PrimaryGeneratedColumn({ name: 'id_cliente' })
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ name: 'apellido_paterno', length: 100 })
  apellidoPaterno: string;

  @Column({ name: 'apellido_materno', length: 100, nullable: true })
  apellidoMaterno: string;

  @Column({ length: 20, nullable: true })
  telefono: string;

  @Column({ length: 150, nullable: true })
  correo: string;

  @Column({ length: 50, unique: true })
  identificacion: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_registro' })
  fechaRegistro: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion: Date;

  @OneToMany(() => Operacion, (op) => op.cliente)
  operaciones: Operacion[];
}
