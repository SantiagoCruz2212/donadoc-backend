import { Body, Controller, Get, Param, Put, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser, Roles } from '@common/decorators/decorators';
import { createResponse } from '@common/envelope/envelope';
import { ApiEnvelope } from '@common/swagger/api-envelope.decorator';
import { AuthUser } from '@common/types/auth-user';
import { PlantillaVista } from '../formatos/formatos.view';
import { GuardarInformeDto } from './dto/guardar-informe.dto';
import { ListarInformesQuery } from './dto/listar-informes.query';
import { InformesService } from './informes.service';
import { InformeResumen, InformeVista } from './informes.view';

@ApiTags('informes')
@ApiBearerAuth()
@Roles('ADMIN_ORG', 'OPERADOR')
@Controller('informes')
export class InformesController {
  constructor(private readonly informes: InformesService) {}

  @Get('plantillas')
  @ApiOperation({ summary: 'Listar los informes periódicos disponibles (p. ej. los mensuales de bancos de tejido) con su estructura' })
  @ApiEnvelope(PlantillaVista, { isArray: true })
  async plantillas() {
    return createResponse('Informes disponibles consultados', await this.informes.listarPlantillas());
  }

  @Get()
  @ApiOperation({ summary: 'Listar los informes de la organización, del periodo más reciente al más antiguo' })
  @ApiEnvelope(InformeResumen, { isArray: true })
  async listar(@CurrentUser() user: AuthUser, @Query() q: ListarInformesQuery) {
    const { items, meta } = await this.informes.listar(user, q);
    return createResponse('Informes consultados', items, meta);
  }

  @Get(':codigo/:periodo')
  @ApiOperation({ summary: 'Obtener un informe de un periodo: estructura, datos guardados y cálculos (totales, columnas calculadas, resúmenes)' })
  @ApiEnvelope(InformeVista)
  @ApiResponse({ status: 400, description: 'El periodo no tiene la forma que exige el informe' })
  @ApiResponse({ status: 404, description: 'El informe no existe' })
  async obtener(@CurrentUser() user: AuthUser, @Param('codigo') codigo: string, @Param('periodo') periodo: string) {
    return createResponse('Informe consultado', await this.informes.obtener(user, codigo, periodo));
  }

  @Put(':codigo/:periodo')
  @ApiOperation({ summary: 'Guardar el informe (borrador o completo). Completo valida los obligatorios y genera el PDF' })
  @ApiEnvelope(InformeVista)
  @ApiResponse({ status: 400, description: 'El periodo no tiene la forma que exige el informe' })
  @ApiResponse({ status: 422, description: 'Hay datos que no cumplen la estructura del informe (campo, fila o celda)' })
  async guardar(
    @CurrentUser() user: AuthUser,
    @Param('codigo') codigo: string,
    @Param('periodo') periodo: string,
    @Body() dto: GuardarInformeDto,
  ) {
    return createResponse('Informe guardado', await this.informes.guardar(user, codigo, periodo, dto));
  }

  @Get(':codigo/:periodo/pdf')
  @ApiOperation({ summary: 'Descargar el PDF del informe completo' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 404, description: 'El informe aún no está completo' })
  async pdf(
    @CurrentUser() user: AuthUser,
    @Param('codigo') codigo: string,
    @Param('periodo') periodo: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { nombre, contenido } = await this.informes.descargarPdf(user, codigo, periodo);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${nombre}"` });
    return new StreamableFile(contenido);
  }
}
