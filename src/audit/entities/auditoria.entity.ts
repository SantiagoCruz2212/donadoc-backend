import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Traza de solo inserción (un trigger de la base de datos rechaza UPDATE y DELETE): quién, qué, sobre qué, cuándo y desde dónde. */
@Entity('auditoria')
export class Auditoria {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', nullable: true }) organizacionId: string | null;
  @Column({ type: 'uuid', nullable: true }) usuarioId: string | null;
  @Column() entidad: string;
  @Column({ type: 'uuid', nullable: true }) entidadId: string | null;
  @Column() accion: string;
  @Column({ type: 'jsonb', nullable: true }) valorAnterior: unknown;
  @Column({ type: 'jsonb', nullable: true }) valorNuevo: unknown;
  @Column({ type: 'varchar', nullable: true }) ip: string | null;
  @Column({ type: 'varchar', nullable: true }) metodo: string | null;
  @Column({ type: 'varchar', nullable: true }) ruta: string | null;
  @Column({ type: 'int', nullable: true }) estadoHttp: number | null;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
}
