import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '@audit/audit.service';
import { BCRYPT_COSTO, generarClaveAleatoria } from '@common/crypto/clave-aleatoria';
import { AuthUser } from '@common/types/auth-user';
import { EnviadorCorreo } from '@correo/enviador-correo';
import { UsersService } from '@users/users.service';
import { AccesoVista, toAccesoVista } from './accesos.view';
import { CrearAccesoDto } from './dto/crear-acceso.dto';

/**
 * Gestión de accesos por el superadmin: crea usuarios de su organización con una clave aleatoria que solo viaja por correo.
 * La clave nunca se devuelve en la respuesta ni se registra en la auditoría.
 */
@Injectable()
export class AccesosService {
  constructor(
    private readonly users: UsersService,
    private readonly audit: AuditService,
    private readonly correo: EnviadorCorreo,
    private readonly cfg: ConfigService,
  ) {}

  private organizacionDe(actor: AuthUser): string {
    if (!actor.organizacionId) throw new ForbiddenException('El superadmin debe pertenecer a una organización');
    return actor.organizacionId;
  }

  async listar(actor: AuthUser): Promise<AccesoVista[]> {
    const lista = await this.users.listarDeOrganizacion(this.organizacionDe(actor));
    return lista.map(toAccesoVista);
  }

  async crear(actor: AuthUser, dto: CrearAccesoDto, ip?: string): Promise<AccesoVista> {
    const org = this.organizacionDe(actor);
    if (await this.users.existe(org, dto.correo)) throw new ConflictException('Ya existe un acceso con ese correo');

    const clave = generarClaveAleatoria();
    const usuario = await this.users.crear({
      organizacionId: org,
      correo: dto.correo,
      nombre: dto.nombre,
      rol: dto.rol,
      perfil: dto.perfil ?? null,
      hashClave: await bcrypt.hash(clave, BCRYPT_COSTO),
    });
    try {
      await this.correo.enviar(usuario.correo, 'Su acceso a DonaDoc', this.cuerpo(usuario.nombre, usuario.correo, clave, 'Se creó su acceso a DonaDoc.'));
    } catch {
      await this.users.borrar(usuario.id); // sin correo no hay forma de entregar la clave: no se deja un acceso huérfano
      throw new ServiceUnavailableException('No se pudo enviar el correo con la clave; el acceso no se creó. Verifique el servicio de correo.');
    }
    await this.audit.log({
      organizacionId: org,
      usuarioId: actor.userId,
      entidad: 'usuario',
      entidadId: usuario.id,
      accion: 'CREAR',
      valorNuevo: { correo: usuario.correo, rol: usuario.rol, perfil: usuario.perfil },
      ip,
    });
    return toAccesoVista(usuario);
  }

  /** Genera una clave nueva y la envía por correo. Si el correo falla, se conserva la clave anterior. */
  async restablecer(actor: AuthUser, id: string, ip?: string): Promise<AccesoVista> {
    const org = this.organizacionDe(actor);
    const usuario = await this.users.buscarEnOrganizacion(org, id);
    if (!usuario) throw new NotFoundException('Acceso no encontrado');
    if (usuario.rol === 'SUPER_ADMIN') throw new ForbiddenException('La clave de un superadmin no se restablece desde aquí');

    const anterior = usuario.hashClave;
    const clave = generarClaveAleatoria();
    await this.users.actualizarClave(usuario.id, await bcrypt.hash(clave, BCRYPT_COSTO));
    try {
      await this.correo.enviar(usuario.correo, 'Nueva clave de DonaDoc', this.cuerpo(usuario.nombre, usuario.correo, clave, 'Se generó una clave nueva para su acceso.'));
    } catch {
      await this.users.actualizarClave(usuario.id, anterior);
      throw new ServiceUnavailableException('No se pudo enviar el correo con la clave; se conserva la clave anterior.');
    }
    await this.audit.log({ organizacionId: org, usuarioId: actor.userId, entidad: 'usuario', entidadId: usuario.id, accion: 'CLAVE_RESTABLECIDA_POR_ADMIN', ip });
    return toAccesoVista(usuario);
  }

  private cuerpo(nombre: string, correo: string, clave: string, motivo: string): string {
    const url = this.cfg.get<string>('FRONTEND_URL') ?? '';
    return [
      `Hola ${nombre},`,
      '',
      motivo,
      '',
      `Dirección: ${url}`,
      `Usuario: ${correo}`,
      `Clave temporal: ${clave}`,
      '',
      'Por seguridad, inicie sesión y cambie la clave desde el menú "Cambiar contraseña".',
      'Si usted no esperaba este mensaje, ignórelo y avise a su administrador.',
    ].join('\n');
  }
}
