import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@common/decorators/decorators';
import { createResponse } from '@common/envelope/envelope';
import { ApiEnvelope } from '@common/swagger/api-envelope.decorator';
import { AuthUser } from '@common/types/auth-user';
import { DecidirSugerenciaDto } from './dto/ia.dto';
import { SugerenciaVista } from './ia.view';
import { SugerenciasService } from './sugerencias.service';

@ApiTags('ia')
@ApiBearerAuth()
@Roles('ADMIN_ORG', 'OPERADOR')
@Controller('sugerencias-ia')
export class SugerenciasIaController {
  constructor(private readonly sugerencias: SugerenciasService) {}

  @Patch(':sugerenciaId')
  @ApiOperation({ summary: 'Aceptar, modificar o rechazar una sugerencia de la IA' })
  @ApiEnvelope(SugerenciaVista)
  async decidir(@CurrentUser() user: AuthUser, @Param('sugerenciaId', ParseUUIDPipe) id: string, @Body() dto: DecidirSugerenciaDto) {
    return createResponse('Decisión registrada', await this.sugerencias.decidir(user, id, dto));
  }
}
