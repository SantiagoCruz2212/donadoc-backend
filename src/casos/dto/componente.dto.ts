import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export const TIPOS_COMPONENTE = ['RINON', 'HIGADO', 'CORAZON', 'PULMON', 'PANCREAS', 'INTESTINO', 'CORNEA', 'PIEL', 'HUESO', 'VALVULA_CARDIACA'] as const;

export class CrearComponenteDto {
  /** Órgano o tejido. */
  @IsIn(TIPOS_COMPONENTE) tipoComponente: string;
  /** ¿Se rescató? */
  @IsBoolean() rescatado: boolean;
  /** Obligatoria cuando no se rescató. */
  @IsOptional() @IsString() @MaxLength(500) causaNoRescate?: string;
  @IsOptional() @IsString() @MaxLength(100) solucionPreservacion?: string;
  @IsOptional() @IsInt() @Min(0) cantidadMl?: number;
}
