import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CambiarEstadoDto {
  /** Nuevo estado: BORRADOR→EN_CURSO|CONTRAINDICADO, EN_CURSO→FIRMADO|CONTRAINDICADO, FIRMADO→CERRADO. */
  @IsIn(['EN_CURSO', 'FIRMADO', 'CERRADO', 'CONTRAINDICADO']) estado: string;
  /** Obligatoria al pasar a CONTRAINDICADO. */
  @IsOptional() @IsString() @MaxLength(1000) causaContraindicacion?: string;
}
