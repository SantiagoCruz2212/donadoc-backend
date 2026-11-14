import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', nullable: true }) organizacionId: string | null;
  @Column() correo: string;
  @Column() hashClave: string;
  @Column() nombre: string;
  @Column() rol: string;
  @Column({ type: 'varchar', nullable: true }) perfil: string | null;
  @Column({ default: 'ACTIVO' }) estado: string;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
  @Column({ type: 'timestamptz', nullable: true }) eliminadoEn: Date | null;
}
