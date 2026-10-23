import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Tipo de cambio de referencia del mercado (fuente externa), un valor por moneda y día.
// valorMxn = cuántos pesos vale 1 unidad de la moneda. Es histórico: solo se inserta.
@Entity('TiposCambioReferencia')
@Index(['fuente', 'moneda', 'fecha'], { unique: true })
export class TipoCambioReferencia {
  @PrimaryGeneratedColumn({ name: 'id_referencia' })
  id: number;

  @Column({ length: 30 })
  fuente: string; // 'frankfurter', más adelante 'banxico'

  @Column({ length: 3 })
  moneda: string;

  // AAAA-MM-DD (fecha de la cotización, no de cuándo se descargó)
  @Column({ length: 10 })
  fecha: string;

  @Column({ name: 'valor_mxn', type: 'decimal', precision: 18, scale: 6 })
  valorMxn: string;

  @CreateDateColumn({ name: 'fecha_consulta' })
  fechaConsulta: Date;
}
