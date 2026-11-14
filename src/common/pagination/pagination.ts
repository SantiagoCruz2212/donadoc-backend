import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Parámetros de paginación comunes a todos los listados. */
export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize: number = 20;
}

export function offsetDe(q: PageQueryDto): number {
  return (q.page - 1) * q.pageSize;
}

export function metaDePagina(q: PageQueryDto, total: number): Record<string, number> {
  return { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}
