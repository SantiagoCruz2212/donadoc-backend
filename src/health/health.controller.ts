import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { Public } from '@common/decorators/decorators';

/** /health: liveness sin dependencias (nunca reinicia por una caída de la base). /health/ready: verifica PostgreSQL (503 si cae). */
@ApiTags('salud')
@Controller()
export class HealthController {
  constructor(private readonly health: HealthCheckService, private readonly db: TypeOrmHealthIndicator) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness: el proceso responde (no consulta la base de datos)' })
  @ApiOkResponse({ description: 'El servicio está vivo', schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } })
  vivo() {
    return { status: 'ok' };
  }

  @Public()
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness: verifica la conexión con PostgreSQL' })
  @ApiOkResponse({ description: 'Listo para recibir tráfico (base de datos disponible)' })
  @ApiServiceUnavailableResponse({ description: 'La base de datos no responde' })
  @HealthCheck()
  listo() {
    return this.health.check([() => this.db.pingCheck('postgres')]);
  }
}
