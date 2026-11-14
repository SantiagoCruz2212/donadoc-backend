import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('donantes')
export class Donante {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizacionId: string;
  @Column() tipoDocumento: string;
  @Column() numeroDocumento: string;
  @Column() nombres: string;
  @Column() apellidos: string;
  @Column({ type: 'varchar', nullable: true }) sexo: string | null;
  @Column({ type: 'date', nullable: true }) fechaNacimiento: string | null;
  @Column({ type: 'timestamptz', nullable: true }) eliminadoEn: Date | null;
}
