import { jsonCifrado, textoCifrado } from '@common/crypto/campo-cifrado';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Órgano o tejido de un caso: si se rescató y por qué no. Sin datos personales. */
@Entity('componentes_caso')
export class ComponenteCaso {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) casoId: string;
  @Column() tipoComponente: string;
  @Column({ default: false }) rescatado: boolean;
  @Column({ type: 'text', nullable: true, transformer: textoCifrado }) causaNoRescate: string | null;
  @Column({ type: 'varchar', nullable: true }) solucionPreservacion: string | null;
  @Column({ type: 'int', nullable: true }) cantidadMl: number | null;
  @Column({ type: 'timestamptz', nullable: true }) horaRegistro: Date | null;
}
