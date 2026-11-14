import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQueryDto } from '@common/pagination/pagination';

export class ListarInformesQuery extends PageQueryDto {
  /** Filtra por código de informe (p. ej. INS-INFORME-BANCO-OCULAR). */
  @IsOptional() @IsString() @MaxLength(40) codigo?: string;
}
