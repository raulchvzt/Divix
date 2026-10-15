import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Rol } from './rol.entity';
import { TipoCambio } from './tipo-cambio.entity';
import { Operacion } from './operacion.entity';
import { CorteCaja } from './corte-caja.entity';
import { MovimientoCaja } from './movimiento-caja.entity';
import { ConsultaAsistente } from './consulta-asistente.entity';

@Entity('Usuarios')
export class Usuario {
  @PrimaryGeneratedColumn({ name: 'id_usuario' })
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ name: 'apellido_paterno', length: 100 })
  apellidoPaterno: string;

  @Column({ name: 'apellido_materno', length: 100, nullable: true })
  apellidoMaterno: string;

  @Column({ length: 50, unique: true })
  usuario: string;

  // Nunca exponer este campo en respuestas: usar un DTO/serializer que lo excluya.
  @Column({ name: 'contrasena_hash', length: 255, select: false })
  contrasenaHash: string;

  @ManyToOne(() => Rol, (rol) => rol.usuarios)
  @JoinColumn({ name: 'id_rol' })
  rol: Rol;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_registro' })
  fechaRegistro: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion: Date;

  @OneToMany(() => TipoCambio, (tc) => tc.usuario)
  tiposCambioRegistrados: TipoCambio[];

  @OneToMany(() => Operacion, (op) => op.usuario)
  operaciones: Operacion[];

  @OneToMany(() => CorteCaja, (corte) => corte.usuario)
  cortesCaja: CorteCaja[];

  @OneToMany(() => MovimientoCaja, (mov) => mov.usuario)
  movimientosCaja: MovimientoCaja[];

  @OneToMany(() => ConsultaAsistente, (consulta) => consulta.usuario)
  consultasAsistente: ConsultaAsistente[];
}
