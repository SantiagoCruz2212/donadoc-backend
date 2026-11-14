import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@common/decorators/decorators';
import { createResponse } from '@common/envelope/envelope';
import { ApiEnvelope } from '@common/swagger/api-envelope.decorator';
import { AuthUser } from '@common/types/auth-user';
import { CasoVista, ComponenteVista } from './casos.view';
import { CasosService } from './casos.service';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { CrearComponenteDto } from './dto/componente.dto';
import { CrearCasoDto } from './dto/crear-caso.dto';
import { ListarCasosQuery } from './dto/listar-casos.query';

@ApiTags('casos')
@ApiBearerAuth()
@Roles('ADMIN_ORG', 'OPERADOR')
@Controller('casos')
export class CasosController {
  constructor(private readonly casos: CasosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un caso de donación (con su donante)' })
  @ApiEnvelope(CasoVista, { created: true })
  async crear(@CurrentUser() user: AuthUser, @Body() dto: CrearCasoDto) {
    return createResponse('Caso creado', await this.casos.crear(user, dto));
  }

  @Get()
  @ApiOperation({ summary: 'Listar los casos de la organización (paginado)' })
  @ApiEnvelope(CasoVista, { isArray: true })
  async listar(@CurrentUser() user: AuthUser, @Query() q: ListarCasosQuery) {
    const { items, meta } = await this.casos.listar(user, q);
    return createResponse('Casos consultados', items, meta);
  }

  @Get(':casoId')
  @ApiOperation({ summary: 'Consultar un caso por identificador' })
  @ApiEnvelope(CasoVista)
  async obtener(@CurrentUser() user: AuthUser, @Param('casoId', ParseUUIDPipe) casoId: string) {
    return createResponse('Caso consultado', await this.casos.obtener(user, casoId));
  }

  @Post(':casoId/estado')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cambiar el estado del caso (solo transiciones válidas; CONTRAINDICADO exige causa)' })
  @ApiEnvelope(CasoVista)
  @ApiResponse({ status: 409, description: 'Transición de estado no permitida' })
  async cambiarEstado(@CurrentUser() user: AuthUser, @Param('casoId', ParseUUIDPipe) casoId: string, @Body() dto: CambiarEstadoDto) {
    return createResponse('Estado actualizado', await this.casos.cambiarEstado(user, casoId, dto));
  }

  @Post(':casoId/componentes')
  @ApiOperation({ summary: 'Registrar un órgano o tejido del caso (rescatado o no, con su causa)' })
  @ApiEnvelope(ComponenteVista, { created: true })
  async agregarComponente(@CurrentUser() user: AuthUser, @Param('casoId', ParseUUIDPipe) casoId: string, @Body() dto: CrearComponenteDto) {
    return createResponse('Componente registrado', await this.casos.agregarComponente(user, casoId, dto));
  }

  @Get(':casoId/componentes')
  @ApiOperation({ summary: 'Listar los órganos y tejidos del caso' })
  @ApiEnvelope(ComponenteVista, { isArray: true })
  async listarComponentes(@CurrentUser() user: AuthUser, @Param('casoId', ParseUUIDPipe) casoId: string) {
    return createResponse('Componentes consultados', await this.casos.listarComponentes(user, casoId));
  }

  @Roles('ADMIN_ORG')
  @Delete(':casoId')
  @ApiOperation({ summary: 'Eliminar (borrado lógico) un caso en borrador o contraindicado; solo ADMIN_ORG' })
  @ApiResponse({ status: 409, description: 'El caso no está en borrador ni contraindicado' })
  async eliminar(@CurrentUser() user: AuthUser, @Param('casoId', ParseUUIDPipe) casoId: string) {
    await this.casos.eliminar(user, casoId);
    return createResponse('Caso eliminado');
  }
}
