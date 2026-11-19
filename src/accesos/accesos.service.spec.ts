import { ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AccesosService } from './accesos.service';

const actor = { userId: 'su-1', organizacionId: 'org-1', rol: 'SUPER_ADMIN' };
const dto = { correo: 'Nuevo@Correo.com', nombre: 'Persona Nueva', rol: 'OPERADOR', perfil: 'AUXILIAR' };

function crear(opciones: { existe?: boolean; correoFalla?: boolean; usuario?: Record<string, unknown> | null } = {}) {
  const users = {
    existe: jest.fn(async () => opciones.existe ?? false),
    crear: jest.fn(async (d: Record<string, unknown>) => ({ id: 'u-1', estado: 'ACTIVO', creadoEn: new Date(), ...d, correo: String(d.correo).toLowerCase() })),
    borrar: jest.fn(async () => undefined),
    listarDeOrganizacion: jest.fn(async () => []),
    buscarEnOrganizacion: jest.fn(async () => (opciones.usuario === undefined ? { id: 'u-2', correo: 'a@b.com', nombre: 'A', rol: 'OPERADOR', perfil: null, estado: 'ACTIVO', creadoEn: new Date(), hashClave: 'hash-viejo' } : opciones.usuario)),
    actualizarClave: jest.fn(async () => undefined),
  };
  const audit = { log: jest.fn(async () => undefined) };
  const correo = { enviar: jest.fn(async () => { if (opciones.correoFalla) throw new Error('smtp'); }) };
  const cfg = { get: jest.fn(() => 'https://donadoc-frontend.vercel.app') };
  const svc = new AccesosService(users as never, audit as never, correo as never, cfg as never);
  return { svc, users, audit, correo };
}

describe('AccesosService.crear', () => {
  it('crea el usuario con hash bcrypt, envía la clave por correo y no la devuelve ni la audita', async () => {
    const { svc, users, correo, audit } = crear();
    const vista = await svc.crear(actor, dto, '1.2.3.4');

    const guardado = users.crear.mock.calls[0][0] as { hashClave: string; organizacionId: string };
    expect(guardado.organizacionId).toBe('org-1');
    const texto = (correo.enviar.mock.calls[0] as unknown[])[2] as string;
    const clave = /Clave temporal: (\S+)/.exec(texto)?.[1] as string;
    expect(clave).toHaveLength(14);
    expect(await bcrypt.compare(clave, guardado.hashClave)).toBe(true);
    expect(JSON.stringify(vista)).not.toContain(clave);
    expect(JSON.stringify(vista)).not.toContain('hashClave');
    expect(JSON.stringify(audit.log.mock.calls)).not.toContain(clave);
    expect(vista.correo).toBe('nuevo@correo.com');
  });

  it('rechaza un correo repetido con 409 y no envía nada', async () => {
    const { svc, correo } = crear({ existe: true });
    await expect(svc.crear(actor, dto)).rejects.toBeInstanceOf(ConflictException);
    expect(correo.enviar).not.toHaveBeenCalled();
  });

  it('si el correo falla, borra el acceso recién creado y responde 503', async () => {
    const { svc, users } = crear({ correoFalla: true });
    await expect(svc.crear(actor, dto)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(users.borrar).toHaveBeenCalledWith('u-1');
  });

  it('un superadmin sin organización no puede crear accesos', async () => {
    await expect(crear().svc.crear({ ...actor, organizacionId: null }, dto)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('AccesosService.restablecer', () => {
  it('cambia la clave y la envía por correo', async () => {
    const { svc, users, correo } = crear();
    await svc.restablecer(actor, 'u-2');
    expect(users.actualizarClave).toHaveBeenCalledTimes(1);
    expect(correo.enviar).toHaveBeenCalledTimes(1);
  });

  it('si el correo falla, restaura la clave anterior', async () => {
    const { svc, users } = crear({ correoFalla: true });
    await expect(svc.restablecer(actor, 'u-2')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(users.actualizarClave).toHaveBeenLastCalledWith('u-2', 'hash-viejo');
  });

  it('responde 404 si el acceso no es de la organización', async () => {
    await expect(crear({ usuario: null }).svc.restablecer(actor, 'u-9')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('no restablece la clave de un superadmin', async () => {
    const { svc } = crear({ usuario: { id: 'u-3', rol: 'SUPER_ADMIN', hashClave: 'h' } });
    await expect(svc.restablecer(actor, 'u-3')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
