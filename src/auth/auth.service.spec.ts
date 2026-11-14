import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

// Envuelve bcrypt.compare para poder contar las llamadas sin cambiar su comportamiento real.
jest.mock('bcryptjs', () => {
  const real = jest.requireActual('bcryptjs');
  return { ...real, compare: jest.fn(real.compare) };
});

const CLAVE = 'Clave-De-Prueba-1';
const HASH = bcrypt.hashSync(CLAVE, 4); // pocas rondas: solo para que la prueba sea rápida

const tenant = { id: 'org-1', nombre: 'Clínica A', clavePublica: 'pk_a', estado: 'ACTIVA' } as never;
const usuario = { id: 'u-1', organizacionId: 'org-1', correo: 'ana@a.local', nombre: 'Ana', rol: 'OPERADOR', perfil: 'COORDINADOR', hashClave: HASH };

function crear(user: unknown = usuario) {
  const users = { findActiveByEmail: jest.fn(async () => user) };
  const jwt = { signAsync: jest.fn(async () => 'jwt-firmado') };
  const audit = { log: jest.fn(async () => undefined) };
  // El OTP y el correo (restablecer y cambiar clave) tienen sus propias pruebas; aquí solo se prueba el inicio de sesión.
  const svc = new AuthService(users as never, jwt as never, audit as never, {} as never, {} as never);
  return { svc, users, jwt, audit };
}

describe('AuthService.login', () => {
  it('con credenciales correctas firma un JWT del personal (sub, org, rol, typ) y devuelve la sesión', async () => {
    const { svc, jwt } = crear();
    const r = await svc.login(tenant, { correo: 'ana@a.local', clave: CLAVE }, '10.0.0.1');
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u-1', org: 'org-1', rol: 'OPERADOR', typ: 'staff' });
    expect(r.accessToken).toBe('jwt-firmado');
    expect(r.usuario).toEqual({ id: 'u-1', nombre: 'Ana', correo: 'ana@a.local', rol: 'OPERADOR', perfil: 'COORDINADOR' });
  });

  it('nunca devuelve el hash de la contraseña en la respuesta', async () => {
    const { svc } = crear();
    const r = await svc.login(tenant, { correo: 'ana@a.local', clave: CLAVE });
    expect(JSON.stringify(r)).not.toContain(HASH);
    expect(JSON.stringify(r)).not.toContain('hashClave');
  });

  it('audita el inicio de sesión correcto con la IP', async () => {
    const { svc, audit } = crear();
    await svc.login(tenant, { correo: 'ana@a.local', clave: CLAVE }, '10.0.0.1');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ accion: 'LOGIN', usuarioId: 'u-1', organizacionId: 'org-1', ip: '10.0.0.1' }));
  });

  it('con clave incorrecta responde 401 «Credenciales inválidas» y audita LOGIN_FALLIDO', async () => {
    const { svc, audit, jwt } = crear();
    await expect(svc.login(tenant, { correo: 'ana@a.local', clave: 'otra' })).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
    expect(jwt.signAsync).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ accion: 'LOGIN_FALLIDO' }));
  });

  it('con correo inexistente responde igual y compara contra un hash de relleno (anti-enumeración)', async () => {
    const { svc } = crear(null);
    const compare = bcrypt.compare as unknown as jest.Mock;
    compare.mockClear();
    await expect(svc.login(tenant, { correo: 'nadie@a.local', clave: CLAVE })).rejects.toThrow('Credenciales inválidas');
    expect(compare).toHaveBeenCalledTimes(1); // aunque el usuario no existe, se gasta el mismo tiempo de comparación
  });

  it('con una organización inexistente (clave de organización desconocida) responde 401 sin buscar usuarios', async () => {
    const { svc, users, audit } = crear();
    await expect(svc.login(null, { correo: 'ana@a.local', clave: CLAVE })).rejects.toThrow('Credenciales inválidas');
    expect(users.findActiveByEmail).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ accion: 'LOGIN_FALLIDO', organizacionId: null }));
  });

  it('el mensaje de error es idéntico para clave incorrecta, correo inexistente y organización inexistente', async () => {
    const mensajes: string[] = [];
    for (const [t, u, clave] of [[tenant, usuario, 'mala'], [tenant, null, CLAVE], [null, usuario, CLAVE]] as const) {
      const { svc } = crear(u);
      await svc.login(t as never, { correo: 'x@a.local', clave }).catch((e: Error) => mensajes.push(e.message));
    }
    expect(new Set(mensajes).size).toBe(1);
    expect(mensajes).toHaveLength(3);
  });
});
