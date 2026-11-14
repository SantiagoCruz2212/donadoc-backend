import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Informe periódico (p. ej. el mensual de un banco de tejidos): una instancia de una plantilla por organización y periodo. */
@Entity('informes')
export class Informe {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizacionId: string;
  @Column({ type: 'uuid' }) plantillaId: string;
  /** «AAAA-MM» (mensual) o «AAAA-Sww» (semanal). */
  @Column() periodo: string;
  @Column({ default: 'BORRADOR' }) estado: string;
  @Column({ default: 1 }) version: number;
  @Column({ type: 'jsonb', default: () => "'{}'" }) datos: Record<string, unknown>;
  @Column({ type: 'varchar', nullable: true }) rutaArchivo: string | null;
  @Column({ name: 'hash_sha256', type: 'varchar', nullable: true }) hashSha256: string | null;
  @Column({ type: 'uuid' }) creadoPor: string;
  @Column({ type: 'uuid' }) actualizadoPor: string;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) actualizadoEn: Date;
}
