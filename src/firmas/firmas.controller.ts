import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CurrentUser, Roles } from '@common/decorators/decorators';
import { createResponse } from '@common/envelope/envelope';
import { ApiEnvelope } from '@common/swagger/api-envelope.decorator';
import { AuthUser } from '@common/types/auth-user';
import { CrearFirmaDto, VerificarFirmaDto } from './dto/firma.dto';
import { FirmasService } from './firmas.service';
import { FirmaVista, VerificacionFirmaVista } from './firmas.view';

@ApiTags('firmas')
@ApiBearerAuth()
@Roles('ADMIN_ORG', 'OPERADOR')
@Controller()
export class FirmasController {
  constructor(private readonly firmas: FirmasService) {}

  @Post('casos/:casoId/documentos/:documentoId/firmas')
  @ApiOperation({ summary: 'Registrar un firmante pendiente en un documento completo' })
  @ApiEnvelope(FirmaVista, { created: true })
  @ApiResponse({ status: 422, description: 'El documento no está completo' })
  async crear(
    @CurrentUser() user: AuthUser,
    @Param('casoId', ParseUUIDPipe) casoId: string,
    @Param('documentoId', ParseUUIDPipe) documentoId: string,
    @Body() dto: CrearFirmaDto,
  ) {
    return createResponse('Firmante registrado', await this.firmas.crear(user, casoId, documentoId, dto));
  }

  @Get('casos/:casoId/documentos/:documentoId/firmas')
  @ApiOperation({ summary: 'Listar las firmas de un documento' })
  @ApiEnvelope(FirmaVista, { isArray: true })
  async listar(@CurrentUser() user: AuthUser, @Param('casoId', ParseUUIDPipe) casoId: string, @Param('documentoId', ParseUUIDPipe) documentoId: string) {
    return createResponse('Firmas consultadas', await this.firmas.listar(user, casoId, documentoId));
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('firmas/:firmaId/enviar-codigo')
  @HttpCode(200)
  @ApiOperation({ summary: 'Enviar al correo del firmante el código de un solo uso para verificar su identidad' })
  @ApiResponse({ status: 409, description: 'Espera de reenvío activa, firma ya realizada o fallo del correo' })
  async enviarCodigo(@CurrentUser() user: AuthUser, @Param('firmaId', ParseUUIDPipe) firmaId: string) {
    await this.firmas.enviarCodigo(user, firmaId);
    return createResponse('Código enviado al correo del firmante');
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('firmas/:firmaId/verificar')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verificar el código del firmante y sellar la firma sobre el hash del PDF',
    description:
      'Verificación por código de un solo uso al correo del firmante (firma electrónica simple, gratuita). ' +
      'La firma queda ligada al hash exacto del PDF; cuando no quedan firmas pendientes el documento pasa a FIRMADO y no admite cambios.',
  })
  @ApiEnvelope(FirmaVista)
  @ApiResponse({ status: 400, description: 'Código inválido o vencido' })
  async verificar(@CurrentUser() user: AuthUser, @Param('firmaId', ParseUUIDPipe) firmaId: string, @Body() dto: VerificarFirmaDto, @Req() req: Request) {
    return createResponse('Firma verificada', await this.firmas.verificar(user, firmaId, dto.codigo, req.ip));
  }

  @Get('firmas/:firmaId/verificacion')
  @ApiOperation({ summary: 'Comprobar la integridad de una firma: que el documento no cambió y el sello coincide' })
  @ApiEnvelope(VerificacionFirmaVista)
  async verificacion(@CurrentUser() user: AuthUser, @Param('firmaId', ParseUUIDPipe) firmaId: string) {
    return createResponse('Firma comprobada', await this.firmas.verificarIntegridad(user, firmaId));
  }
}
