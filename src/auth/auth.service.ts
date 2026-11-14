import { BadRequestException, Injectable, Logger, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '@audit/audit.service';
import { EnviadorCorreo } from '@correo/enviador-correo';
import { AuthUser } from '@common/types/auth-user';
import { OtpService } from '@otp/otp.service';
import { Organizacion } from '@tenants/entities/organizacion.entity';
import { UsersService } from '@users/users.service';
import { CambiarClaveDto, RestablecerClaveDto } from './dto/clave.dto';
import { LoginDto } from './dto/login.dto';
import { SesionVista, toSesionVista } from './auth.view';

// Hash de relleno para que el tiempo de respuesta no revele si el correo o la organización existen (anti-enumeración).
const DUMMY_HASH = bcrypt.hashSync('relleno-anti-enumeracion', 12);
const PROPOSITO_RESET = 'reset-clave';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly otp: OtpService,
    private readonly correo: EnviadorCorreo,
  ) {}

  async login(tenant: Organizacion | null, dto: LoginDto, ip?: string): Promise<SesionVista> {
    const user = tenant ? await this.users.findActiveByEmail(tenant.id, dto.correo) : null;
    const ok = await bcrypt.compare(dto.clave, user?.hashClave ?? DUMMY_HASH);
    if (!tenant || !user || !ok) {
      await this.audit.log({ organizacionId: tenant?.id ?? null, entidad: 'sesion', accion: 'LOGIN_FALLIDO', ip });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const accessToken = await this.jwt.signAsync({ sub: user.id, org: user.organizacionId, rol: user.rol, typ: 'staff' });
    await this.audit.log({ organizacionId: tenant.id, usuarioId: user.id, entidad: 'sesion', accion: 'LOGIN', ip });
    return toSesionVista(accessToken, user);
  }

  /**
   * «Olvidé mi contraseña»: envía un código OTP al correo si la cuenta existe. La respuesta es siempre la misma
   * (exista o no la cuenta) y el envío no se espera, para no revelar qué correos están registrados.
   */
  async solicitarRestablecimiento(tenant: Organizacion | null, correo: string, ip?: string): Promise<void> {
    const user = tenant ? await this.users.findActiveByEmail(tenant.id, correo) : null;
    await this.audit.log({ organizacionId: tenant?.id ?? null, usuarioId: user?.id ?? null, entidad: 'sesion', accion: 'CLAVE_OLVIDADA', ip });
    if (!tenant || !user) return;
    void this.otp
      .enviar(PROPOSITO_RESET, `${tenant.id}:${user.correo}`, user.correo, 'Código para restablecer su contraseña de DonaDoc', (codigo, min) =>
        `Su código de verificación es ${codigo}.\nVence en ${min} minutos y solo sirve una vez.\nSi usted no lo solicitó, ignore este mensaje: su contraseña no cambia.`,
      )
      .catch(() => undefined);
  }

  /** Cambia la contraseña con el código recibido por correo. Cualquier fallo responde igual: código inválido o vencido. */
  async restablecerClave(tenant: Organizacion | null, dto: RestablecerClaveDto, ip?: string): Promise<void> {
    const user = tenant ? await this.users.findActiveByEmail(tenant.id, dto.correo) : null;
    const valido = tenant && user ? await this.otp.verificar(PROPOSITO_RESET, `${tenant.id}:${user.correo}`, dto.codigo) : false;
    if (!tenant || !user || !valido) {
      await this.audit.log({ organizacionId: tenant?.id ?? null, entidad: 'sesion', accion: 'RESET_FALLIDO', ip });
      throw new BadRequestException('Código inválido o vencido');
    }
    await this.users.actualizarClave(user.id, await bcrypt.hash(dto.nuevaClave, 12));
    await this.audit.log({ organizacionId: tenant.id, usuarioId: user.id, entidad: 'usuario', entidadId: user.id, accion: 'CLAVE_RESTABLECIDA', ip });
    this.avisarCambio(user.correo);
  }

  /** Cambio de contraseña con sesión iniciada: exige la contraseña actual. */
  async cambiarClave(actor: AuthUser, dto: CambiarClaveDto, ip?: string): Promise<void> {
    const user = await this.users.findActiveById(actor.userId);
    if (!user) throw new UnauthorizedException('Sesión inválida');
    if (!(await bcrypt.compare(dto.claveActual, user.hashClave))) {
      await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.id, entidad: 'usuario', entidadId: user.id, accion: 'CAMBIO_CLAVE_FALLIDO', ip });
      // 422 y no 401: un 401 haría que la aplicación cierre la sesión por una contraseña mal escrita.
      throw new UnprocessableEntityException('La contraseña actual no es correcta');
    }
    if (dto.claveActual === dto.nuevaClave) throw new BadRequestException('La nueva contraseña debe ser distinta de la actual');
    await this.users.actualizarClave(user.id, await bcrypt.hash(dto.nuevaClave, 12));
    await this.audit.log({ organizacionId: user.organizacionId, usuarioId: user.id, entidad: 'usuario', entidadId: user.id, accion: 'CLAVE_CAMBIADA', ip });
    this.avisarCambio(user.correo);
  }

  /** Aviso de seguridad: si no fue la persona, puede reaccionar. No bloquea ni falla la operación. */
  private avisarCambio(correo: string): void {
    void this.correo
      .enviar(correo, 'Su contraseña de DonaDoc fue cambiada', 'Le informamos que la contraseña de su cuenta DonaDoc acaba de cambiar.\nSi no fue usted, restablézcala de inmediato desde «Olvidé mi contraseña» y avise a su administrador.')
      .catch(() => this.logger.warn('No se pudo enviar el aviso de cambio de contraseña'));
  }
}
