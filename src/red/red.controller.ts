import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@common/decorators/decorators';
import { createResponse } from '@common/envelope/envelope';
import { PageQueryDto } from '@common/pagination/pagination';
import { ApiEnvelope } from '@common/swagger/api-envelope.decorator';
import { AuthUser } from '@common/types/auth-user';
import { RedService } from './red.service';
import { TrasplanteVigenteVista } from './red.view';

@ApiTags('red')
@ApiBearerAuth()
@Roles('ADMIN_ORG', 'OPERADOR')
@Controller('red')
export class RedController {
  constructor(private readonly red: RedService) {}

  @Get('trasplantes-vigentes')
  @ApiOperation({
    summary: 'Trasplantes vigentes de todas las instituciones, SIN datos personales',
    description:
      'Muestra solo: código público seudónimo, institución, tipo de donante, estado, fecha de inicio y órganos/tejidos. ' +
      'Nunca incluye nombres, documentos, edad, causa de muerte ni documentos del donante. El detalle completo solo existe en `/casos` y solo de la propia institución.',
  })
  @ApiEnvelope(TrasplanteVigenteVista, { isArray: true })
  async vigentes(@CurrentUser() user: AuthUser, @Query() q: PageQueryDto) {
    const { items, meta } = await this.red.vigentes(user, q);
    return createResponse('Trasplantes vigentes consultados', items, meta);
  }
}
