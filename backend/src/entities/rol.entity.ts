import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('Roles')
export class Rol {
  @PrimaryGeneratedColumn({ name: 'id_rol' })
  id: number;

  @Column({ name: 'nombre_rol', length: 50, unique: true })
  nombreRol: string;

  @Column({ length: 255, nullable: true })
  descripcion: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @OneToMany(() => Usuario, (usuario) => usuario.rol)
  usuarios: Usuario[];
}
