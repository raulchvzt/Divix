import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  type Relation,
} from 'typeorm';
import { Usuario } from './usuario.entity';
import { MovimientoCaja } from './movimiento-caja.entity';

// total_compras, total_ventas y diferencia_caja son snapshot histórico:
// se calculan una sola vez al cerrar el corte (en el service) y quedan
// congelados aunque después cambien datos relacionados.
@Entity('CortesCaja')
export class CorteCaja {
  @PrimaryGeneratedColumn({ name: 'id_corte' })
  id: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.cortesCaja)
  @JoinColumn({ name: 'id_usuario' })
  usuario: Relation<Usuario>;

  @Column({ name: 'fecha_apertura', type: 'datetime' })
  fechaApertura: Date;

  @Column({ name: 'fecha_cierre', type: 'datetime', nullable: true })
  fechaCierre: Date | null;

  @Column({ name: 'efectivo_inicial', type: 'decimal', precision: 15, scale: 4 })
  efectivoInicial: string;

  @Column({ name: 'efectivo_final', type: 'decimal', precision: 15, scale: 4, nullable: true })
  efectivoFinal: string | null;

  @Column({ name: 'total_compras', type: 'decimal', precision: 15, scale: 4, nullable: true })
  totalCompras: string | null;

  @Column({ name: 'total_ventas', type: 'decimal', precision: 15, scale: 4, nullable: true })
  totalVentas: string | null;

  @Column({ name: 'diferencia_caja', type: 'decimal', precision: 15, scale: 4, nullable: true })
  diferenciaCaja: string | null;

  // --- Caja multimoneda ---
  // efectivoInicial / efectivoFinal = pesos (MXN) del cajero.
  // La caja fuerte (reserva) y las demás monedas se guardan aparte.
  @Column({ name: 'reserva_inicial', type: 'decimal', precision: 15, scale: 4, default: 0 })
  reservaInicial: string;

  @Column({ name: 'reserva_final', type: 'decimal', precision: 15, scale: 4, nullable: true })
  reservaFinal: string | null;

  // Mapas { USD: '1200.0000', CAD: '0.0000', ... } con las monedas distintas de MXN.
  @Column({ name: 'saldos_iniciales', type: 'json', nullable: true })
  saldosIniciales: Record<string, string> | null;

  @Column({ name: 'saldos_finales', type: 'json', nullable: true })
  saldosFinales: Record<string, string> | null;

  // Diferencia (contado - esperado) por moneda, incluida 'MXN' y 'reserva'. Snapshot al cerrar.
  @Column({ type: 'json', nullable: true })
  diferencias: Record<string, string> | null;

  // Billetes de USD por denominación { "100": 5, "50": 2, ... }: los contados al
  // abrir, los contados al cerrar y la diferencia (contado - esperado) al cerrar.
  @Column({ name: 'billetes_iniciales', type: 'json', nullable: true })
  billetesIniciales: Record<string, number> | null;

  @Column({ name: 'billetes_finales', type: 'json', nullable: true })
  billetesFinales: Record<string, number> | null;

  @Column({ name: 'diferencias_billetes', type: 'json', nullable: true })
  diferenciasBilletes: Record<string, number> | null;

  @OneToMany(() => MovimientoCaja, (mov) => mov.corte)
  movimientos: MovimientoCaja[];
}
