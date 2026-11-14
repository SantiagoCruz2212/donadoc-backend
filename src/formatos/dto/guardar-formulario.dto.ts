import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class GuardarFormularioDto {
  /** Valores por clave de campo, según el esquema del formato. */
  @IsObject() datos: Record<string, unknown>;
  /** true para marcarlo completo: exige los campos obligatorios y genera el PDF. */
  @IsOptional() @IsBoolean() completo?: boolean;
}
