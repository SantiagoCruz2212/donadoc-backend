import { jsonCifrado, textoCifrado } from '@common/crypto/campo-cifrado';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ExtraccionIa } from './extraccion-ia.entity';

const numerico = { to: (v?: number) => v, from: (v?: string | null) => (v === null || v === undefined ? null : Number(v)) };

/** Dato sugerido por la IA con su confianza y la decisión humana (aceptada, modificada o rechazada). */
@Entity('sugerencias_ia')
export class SugerenciaIa {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) extraccionId: string;
  @ManyToOne(() => ExtraccionIa, (e) => e.sugerencias)
  @JoinColumn({ name: 'extraccion_id' })
  extraccion: ExtraccionIa;
  @Column() campo: string;
  @Column({ type: 'text', nullable: true, transformer: textoCifrado }) valorSugerido: string | null;
  @Column({ type: 'numeric', precision: 4, scale: 3, nullable: true, transformer: numerico }) confianza: number | null;
  @Column({ default: 'PENDIENTE' }) decision: string;
  @Column({ type: 'text', nullable: true, transformer: textoCifrado }) valorFinal: string | null;
  @Column({ type: 'uuid', nullable: true }) decididoPor: string | null;
  @Column({ type: 'timestamptz', nullable: true }) decididoEn: Date | null;
}
