import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageQueryDto } from '@common/pagination/pagination';

export class ConsultarAuditoriaQuery extends PageQueryDto {
  /** Usuario que realizó la acción. */
  @IsOptional() @IsUUID() usuarioId?: string;
  /** Tipo de registro afectado (casos, documentos, sesion, formatos…). */
  @IsOptional() @IsString() @MaxLength(60) entidad?: string;
  /** Identificador del registro afectado. */
  @IsOptional() @IsUUID() entidadId?: string;
  /** CONSULTAR, CREAR, EDITAR, ELIMINAR, LOGIN… */
  @IsOptional() @IsString() @MaxLength(30) accion?: string;
  /** Desde (ISO 8601, inclusive). */
  @IsOptional() @Type(() => Date) @IsDate() desde?: Date;
  /** Hasta (ISO 8601, inclusive). */
  @IsOptional() @Type(() => Date) @IsDate() hasta?: Date;
}
