import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Firma electrónica de un documento: quién firma, cómo se verificó y a qué versión exacta (hash) quedó vinculada. */
@Entity('firmas')
export class Firma {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) documentoId: string;
  @Column() firmanteNombre: string;
  @Column() firmanteRol: string;
  @Column({ type: 'varchar', nullable: true }) firmanteCorreo: string | null;
  @Column() orden: number;
  @Column({ default: 'PENDIENTE' }) estado: string;
  @Column({ type: 'timestamptz', nullable: true }) firmadoEn: Date | null;
  @Column({ type: 'varchar', nullable: true }) proveedor: string | null;
  /** SHA-256 del PDF al momento de firmar: si el archivo cambia después, la verificación falla. */
  @Column({ type: 'varchar', nullable: true }) documentoHash: string | null;
  /** SHA-256 de (documento, firma, firmante, instante, proveedor): sello de la firma. */
  @Column({ type: 'varchar', nullable: true }) hashFirma: string | null;
  @Column({ type: 'varchar', nullable: true }) verificadaIp: string | null;
}
