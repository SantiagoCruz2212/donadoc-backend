import { jsonCifrado, textoCifrado } from '@common/crypto/campo-cifrado';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SugerenciaIa } from './sugerencia-ia.entity';

/** Cada solicitud de extracción a la IA sobre una historia clínica externa; guarda proveedor, estado e intentos. */
@Entity('extracciones_ia')
export class ExtraccionIa {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) casoId: string;
  @Column({ type: 'uuid' }) documentoOrigenId: string;
  @Column() proveedor: string;
  @Column({ type: 'varchar', nullable: true }) modelo: string | null;
  @Column({ default: 'PENDIENTE' }) estado: string;
  @Column({ default: 0 }) intentos: number;
  @Column({ type: 'uuid', nullable: true }) solicitadoPor: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) solicitadoEn: Date;
  @Column({ type: 'timestamptz', nullable: true }) respondidoEn: Date | null;
  @Column({ type: 'jsonb', nullable: true, transformer: jsonCifrado }) respuestaJson: unknown;
  @OneToMany(() => SugerenciaIa, (s) => s.extraccion)
  sugerencias: SugerenciaIa[];
}
