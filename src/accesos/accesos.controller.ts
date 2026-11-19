import { Body, Controller, Get, Ip, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@common/decorators/decorators';
import { createResponse } from '@common/envelope/envelope';
import { ApiEnvelope } from '@common/swagger/api-envelope.decorator';
import { AuthUser } from '@common/types/auth-user';
import { AccesoVista } from './accesos.view';
import { AccesosService } from './accesos.service';
import { CrearAccesoDto } from './dto/crear-acceso.dto';

@ApiTags('accesos')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
@Controller('accesos')
export class AccesosController {
  constructor(private readonly accesos: AccesosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar los accesos de la organización (solo superadmin)' })
  @ApiEnvelope(AccesoVista, { isArray: true })
  async listar(@CurrentUser() user: AuthUser) {
    return createResponse('Accesos consultados', await this.accesos.listar(user));
  }

  @Post()
  @ApiOperation({ summary: 'Crear un acceso: se genera una clave aleatoria y se envía por correo (solo superadmin)' })
  @ApiEnvelope(AccesoVista, { created: true })
  async crear(@CurrentUser() user: AuthUser, @Body() dto: CrearAccesoDto, @Ip() ip: string) {
    return createResponse('Acceso creado: la clave se envió por correo', await this.accesos.crear(user, dto, ip));
  }

  @Post(':id/restablecer')
  @ApiOperation({ summary: 'Generar una clave nueva para un acceso y enviarla por correo (solo superadmin)' })
  @ApiEnvelope(AccesoVista, { created: true })
  async restablecer(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Ip() ip: string) {
    return createResponse('Clave nueva enviada por correo', await this.accesos.restablecer(user, id, ip));
  }
}
