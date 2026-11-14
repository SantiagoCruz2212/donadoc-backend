import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CurrentUser, Public } from '@common/decorators/decorators';
import { createResponse } from '@common/envelope/envelope';
import { ApiEnvelope } from '@common/swagger/api-envelope.decorator';
import { AuthUser } from '@common/types/auth-user';
import { Organizacion } from '@tenants/entities/organizacion.entity';
import { Tenant, TenantKeyGuard } from '@tenants/tenant-key.guard';
import { SesionVista } from './auth.view';
import { AuthService } from './auth.service';
import { CambiarClaveDto, OlvideClaveDto, RestablecerClaveDto } from './dto/clave.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(TenantKeyGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesión (devuelve un JWT RS256 de acceso corto)' })
  @ApiHeader({ name: 'X-Tenant-Key', description: 'Clave pública de la organización; solo selecciona el tenant' })
  @ApiEnvelope(SesionVista)
  async login(@Tenant() tenant: Organizacion | null, @Body() dto: LoginDto, @Req() req: Request) {
    return createResponse('Sesión iniciada', await this.auth.login(tenant, dto, req.ip));
  }

  @Public()
  @UseGuards(TenantKeyGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('olvide-clave')
  @HttpCode(200)
  @ApiOperation({ summary: 'Olvidé mi contraseña: envía un código OTP al correo (la respuesta no revela si la cuenta existe)' })
  @ApiHeader({ name: 'X-Tenant-Key', description: 'Clave pública de la organización; solo selecciona el tenant' })
  @ApiResponse({ status: 200, description: 'Siempre responde igual, exista o no la cuenta' })
  async olvideClave(@Tenant() tenant: Organizacion | null, @Body() dto: OlvideClaveDto, @Req() req: Request) {
    await this.auth.solicitarRestablecimiento(tenant, dto.correo, req.ip);
    return createResponse('Si el correo está registrado, recibirá un código de verificación');
  }

  @Public()
  @UseGuards(TenantKeyGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('restablecer-clave')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restablecer la contraseña con el código OTP recibido por correo' })
  @ApiHeader({ name: 'X-Tenant-Key', description: 'Clave pública de la organización; solo selecciona el tenant' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 400, description: 'Código inválido o vencido, o contraseña que no cumple la política' })
  async restablecerClave(@Tenant() tenant: Organizacion | null, @Body() dto: RestablecerClaveDto, @Req() req: Request) {
    await this.auth.restablecerClave(tenant, dto, req.ip);
    return createResponse('Contraseña actualizada');
  }

  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('cambiar-clave')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cambiar la contraseña de la sesión actual (exige la contraseña vigente)' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 422, description: 'La contraseña actual no es correcta' })
  async cambiarClave(@CurrentUser() user: AuthUser, @Body() dto: CambiarClaveDto, @Req() req: Request) {
    await this.auth.cambiarClave(user, dto, req.ip);
    return createResponse('Contraseña actualizada');
  }
}
