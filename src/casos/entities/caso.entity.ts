import { jsonCifrado, textoCifrado } from '@common/crypto/campo-cifrado';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Donante } from './donante.entity';

/** Un proceso de donación: reúne donante, rescate, documentos, firmas y paquetes. */
@Entity('casos')
export class Caso {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizacionId: string;
  @Column({ type: 'uuid' }) donanteId: string;
  @ManyToOne(() => Donante)
  @JoinColumn({ name: 'donante_id' })
  donante: Donante;
  @Column({ type: 'uuid' }) creadoPor: string;
  @Column({ default: 'BORRADOR' }) estado: string;
  @Column({ type: 'varchar', nullable: true }) tipoDonante: string | null;
  @Column({ default: false }) muerteViolenta: boolean;
  @Column({ type: 'text', nullable: true, transformer: textoCifrado }) causaMuerte: string | null;
  @Column({ type: 'text', nullable: true, transformer: textoCifrado }) causaContraindicacion: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) actualizadoEn: Date;
  @Column({ type: 'timestamptz', nullable: true }) eliminadoEn: Date | null;
}
