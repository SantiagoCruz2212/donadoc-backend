import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EsquemaFormato } from '../esquema';

/** Definición de un formato (campos, tipos, orígenes de precarga). Versionada: una versión nueva no altera lo ya diligenciado. */
@Entity('plantillas_formato')
export class PlantillaFormato {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() codigo: string;
  @Column() nombre: string;
  @Column() version: string;
  @Column({ type: 'jsonb' }) esquema: EsquemaFormato;
  @Column({ default: true }) vigente: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
}
