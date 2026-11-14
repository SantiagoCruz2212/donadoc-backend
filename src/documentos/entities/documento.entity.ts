import { jsonCifrado, textoCifrado } from '@common/crypto/campo-cifrado';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('documentos')
export class Documento {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) casoId: string;
  @Column({ type: 'uuid', nullable: true }) plantillaId: string | null;
  @Column() tipo: string;
  @Column({ default: 'BORRADOR' }) estado: string;
  @Column({ default: 1 }) version: number;
  @Column({ default: false }) anonimizado: boolean;
  /** Datos diligenciados cuando el documento es una instancia de un formato (tipo FORMATO). */
  @Column({ type: 'jsonb', nullable: true, transformer: jsonCifrado }) datos: Record<string, unknown> | null;
  @Column({ type: 'varchar', nullable: true }) rutaArchivo: string | null;
  @Column({ name: 'hash_sha256', type: 'varchar', nullable: true }) hashSha256: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
  @Column({ type: 'timestamptz', nullable: true }) eliminadoEn: Date | null;
}
