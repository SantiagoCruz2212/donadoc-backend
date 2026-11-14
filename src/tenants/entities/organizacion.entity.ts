import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Una clínica o IPS cliente (tenant). Las tablas de negocio apuntan a ella para aislar los datos. */
@Entity('organizaciones')
export class Organizacion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() nombre: string;
  @Column({ type: 'varchar', nullable: true }) nit: string | null;
  @Column() clavePublica: string;
  @Column({ default: 'ACTIVA' }) estado: string;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
}
