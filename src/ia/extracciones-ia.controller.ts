import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@common/decorators/decorators';
import { createResponse } from '@common/envelope/envelope';
import { ApiEnvelope } from '@common/swagger/api-envelope.decorator';
import { AuthUser } from '@common/types/auth-user';
import { ExtraerDto } from './dto/ia.dto';
import { ExtraerConIaService } from './extraer-con-ia.service';
import { ExtraccionVista } from './ia.view';

@ApiTags('ia')
@ApiBearerAuth()
@Roles('ADMIN_ORG', 'OPERADOR')
@Controller()
export class ExtraccionesIaController {
  constructor(private readonly extraer: ExtraerConIaService) {}

  @Post('casos/:casoId/extracciones-ia')
  @ApiOperation({ summary: 'Solicitar la extracción con IA de una historia clínica externa ya cargada' })
  @ApiEnvelope(ExtraccionVista, { created: true })
  async solicitar(@CurrentUser() user: AuthUser, @Param('casoId', ParseUUIDPipe) casoId: string, @Body() dto: ExtraerDto) {
    const { mensaje, extraccion } = await this.extraer.ejecutar(user, casoId, dto.documentoOrigenId);
    return createResponse(mensaje, extraccion);
  }

  @Get('casos/:casoId/extracciones-ia')
  @ApiOperation({ summary: 'Listar las extracciones de un caso' })
  @ApiEnvelope(ExtraccionVista, { isArray: true })
  async listar(@CurrentUser() user: AuthUser, @Param('casoId', ParseUUIDPipe) casoId: string) {
    return createResponse('Extracciones consultadas', await this.extraer.listarDeCaso(user, casoId));
  }

  @Get('extracciones-ia/:extraccionId')
  @ApiOperation({ summary: 'Consultar el estado y las sugerencias de una extracción' })
  @ApiEnvelope(ExtraccionVista)
  async consultar(@CurrentUser() user: AuthUser, @Param('extraccionId', ParseUUIDPipe) id: string) {
    return createResponse('Extracción consultada', await this.extraer.consultar(user, id));
  }
}
