import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@common/decorators/decorators';
import { createResponse } from '@common/envelope/envelope';
import { ApiEnvelope } from '@common/swagger/api-envelope.decorator';
import { AuthUser } from '@common/types/auth-user';
import { AuditoriaVista } from './audit.view';
import { AuditService } from './audit.service';
import { ConsultarAuditoriaQuery } from './dto/consultar-auditoria.query';

@ApiTags('auditoria')
@ApiBearerAuth()
@Roles('ADMIN_ORG')
@Controller('auditoria')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar la traza de auditoría de la organización (quién consultó, creó, modificó o eliminó qué y cuándo)' })
  @ApiEnvelope(AuditoriaVista, { isArray: true })
  async consultar(@CurrentUser() user: AuthUser, @Query() q: ConsultarAuditoriaQuery) {
    const { items, meta } = await this.audit.consultar(user, q);
    return createResponse('Auditoría consultada', items, meta);
  }
}
