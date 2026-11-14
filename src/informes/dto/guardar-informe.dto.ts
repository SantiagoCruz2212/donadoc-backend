import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class GuardarInformeDto {
  /** Valores por clave de campo; las tablas son listas de filas {columna: valor}. Las columnas calculadas no se envían. */
  @IsObject() datos: Record<string, unknown>;
  /** true para marcarlo completo: exige los campos obligatorios y genera el PDF. */
  @IsOptional() @IsBoolean() completo?: boolean;
}
