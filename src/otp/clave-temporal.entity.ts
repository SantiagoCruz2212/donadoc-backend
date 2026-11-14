import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Valor de vida corta (códigos OTP): solo se guarda un HMAC del código, nunca el código. */
@Entity('claves_temporales')
export class ClaveTemporal {
  @PrimaryColumn() claveHash: string;
  @Column({ type: 'jsonb' }) valor: { codigoHash: string; intentos: number; creadoEn: number };
  @Column({ type: 'timestamptz' }) expiraEn: Date;
}
