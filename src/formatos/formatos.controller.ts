import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser, Roles } from '@common/decorators/decorators';
import { createResponse } from '@common/envelope/envelope';
import { ApiEnvelope } from '@common/swagger/api-envelope.decorator';
import { AuthUser } from '@common/types/auth-user';
import { GuardarFormularioDto } from './dto/guardar-formulario.dto';
import { FormatosService } from './formatos.service';
import { FormularioVista, PlantillaVista } from './formatos.view';

@ApiTags('formatos')
@ApiBearerAuth()
@Roles('ADMIN_ORG', 'OPERADOR')
@Controller()
export class FormatosController {
  constructor(private readonly formatos: FormatosService) {}

  @Get('formatos')
  @ApiOperation({ summary: 'Listar los formatos vigentes y los campos que cada uno solicita' })
  @ApiEnvelope(PlantillaVista, { isArray: true })
  async listar() {
    return createResponse('Formatos consultados', await this.formatos.listar());
  }

  @Get('casos/:casoId/formularios/:codigo')
  @ApiOperation({ summary: 'Obtener el formulario de un formato para un caso: esquema, datos guardados y valores precargados' })
  @ApiEnvelope(FormularioVista)
  async obtener(@CurrentUser() user: AuthUser, @Param('casoId', ParseUUIDPipe) casoId: string, @Param('codigo') codigo: string) {
    return createResponse('Formulario consultado', await this.formatos.obtener(user, casoId, codigo));
  }

  @Put('casos/:casoId/formularios/:codigo')
  @ApiOperation({ summary: 'Guardar el formulario (borrador o completo). Completo valida los obligatorios y genera el PDF' })
  @ApiEnvelope(FormularioVista)
  @ApiResponse({ status: 409, description: 'El formato ya fue firmado y no se puede modificar' })
  @ApiResponse({ status: 422, description: 'Hay campos que no cumplen el esquema del formato' })
  async guardar(
    @CurrentUser() user: AuthUser,
    @Param('casoId', ParseUUIDPipe) casoId: string,
    @Param('codigo') codigo: string,
    @Body() dto: GuardarFormularioDto,
  ) {
    return createResponse('Formulario guardado', await this.formatos.guardar(user, casoId, codigo, dto));
  }

  @Get('casos/:casoId/formularios/:codigo/pdf')
  @ApiOperation({ summary: 'Descargar el PDF del formato completo' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 404, description: 'El formato aún no está completo' })
  async pdf(
    @CurrentUser() user: AuthUser,
    @Param('casoId', ParseUUIDPipe) casoId: string,
    @Param('codigo') codigo: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { nombre, contenido } = await this.formatos.descargarPdf(user, casoId, codigo);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${nombre}"` });
    return new StreamableFile(contenido);
  }
}
