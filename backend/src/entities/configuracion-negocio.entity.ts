import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

// Tabla de una sola fila (id = 1) con los datos del negocio.
@Entity('ConfiguracionNegocio')
export class ConfiguracionNegocio {
  @PrimaryGeneratedColumn({ name: 'id_configuracion' })
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 20, default: '' })
  rfc: string;

  @Column({ length: 30, default: '' })
  telefono: string;

  @Column({ length: 150, default: '' })
  correo: string;

  @Column({ length: 255, default: '' })
  direccion: string;

  @Column({ name: 'hora_apertura', length: 5, default: '09:00' })
  horaApertura: string;

  @Column({ name: 'hora_cierre', length: 5, default: '18:00' })
  horaCierre: string;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion: Date;
}
