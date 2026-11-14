import { IsIn, IsOptional } from 'class-validator';
import { PageQueryDto } from '@common/pagination/pagination';

export class ListarCasosQuery extends PageQueryDto {
  @IsOptional() @IsIn(['BORRADOR', 'EN_CURSO', 'FIRMADO', 'CERRADO', 'CONTRAINDICADO']) estado?: string;
}
