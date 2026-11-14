import { generateKeyPairSync } from 'crypto';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC } from '@common/decorators/decorators';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { resolveKeys } from './keys';
import { JwtStrategy } from './strategies/jwt.strategy';

describe('JwtStrategy.validate (solo tokens del personal)', () => {
  const estrategia = new JwtStrategy({ privateKey: 'x', publicKey: generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'pem' }).toString() });

  it('un token del personal (typ: staff) produce el usuario autenticado', () => {
    expect(estrategia.validate({ sub: 'u1', org: 'org-1', rol: 'OPERADOR', typ: 'staff' })).toEqual({ userId: 'u1', organizacionId: 'org-1', rol: 'OPERADOR' });
  });

  it('un token de otra audiencia (typ distinto) se rechaza con 401', () => {
    expect(() => estrategia.validate({ sub: 'u1', org: 'org-1', rol: 'OPERADOR', typ: 'client' })).toThrow(UnauthorizedException);
  });

  it('un token sin typ se rechaza con 401', () => {
    expect(() => estrategia.validate({ sub: 'u1', org: null, rol: 'OPERADOR' } as never)).toThrow(UnauthorizedException);
  });
});

describe('JwtAuthGuard (guardia global)', () => {
  const contexto = {} as ExecutionContext;

  it('deja pasar las rutas marcadas como públicas sin pedir token', () => {
    const reflector = { getAllAndOverride: jest.fn((k: string) => k === IS_PUBLIC) } as unknown as Reflector;
    const g = new JwtAuthGuard(reflector);
    Object.assign(contexto, { getHandler: () => undefined, getClass: () => undefined });
    expect(g.canActivate(contexto)).toBe(true);
  });

  it('handleRequest sin usuario responde 401 «Sesión inválida o vencida»', () => {
    const g = new JwtAuthGuard({} as Reflector);
    expect(() => g.handleRequest(null, null)).toThrow(new UnauthorizedException('Sesión inválida o vencida'));
  });

  it('handleRequest con error de verificación responde 401', () => {
    const g = new JwtAuthGuard({} as Reflector);
    expect(() => g.handleRequest(new Error('jwt expired'), { userId: 'u1' })).toThrow(UnauthorizedException);
  });

  it('handleRequest con usuario válido lo devuelve', () => {
    const g = new JwtAuthGuard({} as Reflector);
    expect(g.handleRequest(null, { userId: 'u1' })).toEqual({ userId: 'u1' });
  });
});

describe('Firma y verificación RS256 de extremo a extremo', () => {
  const cfg = (valores: Record<string, string>) => ({ get: (k: string) => valores[k] }) as never;

  it('sin llaves en el entorno se genera un par efímero RS256 utilizable', async () => {
    const keys = resolveKeys(cfg({}));
    expect(keys.privateKey).toContain('BEGIN PRIVATE KEY');
    const jwt = new JwtService({ privateKey: keys.privateKey, publicKey: keys.publicKey, signOptions: { algorithm: 'RS256' } });
    const token = await jwt.signAsync({ sub: 'u1' });
    expect((await jwt.verifyAsync(token, { algorithms: ['RS256'] })).sub).toBe('u1');
  });

  it('con llaves en el entorno convierte los \\n literales en saltos de línea', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
    const keys = resolveKeys(cfg({ JWT_PRIVATE_KEY: privateKey.replace(/\n/g, '\\n'), JWT_PUBLIC_KEY: publicKey.replace(/\n/g, '\\n') }));
    expect(keys.privateKey).toBe(privateKey);
    expect(keys.publicKey).toBe(publicKey);
  });

  it('un token firmado con otra llave no se puede verificar (suplantación)', async () => {
    const a = resolveKeys(cfg({}));
    const b = resolveKeys(cfg({}));
    const firmador = new JwtService({ privateKey: a.privateKey, signOptions: { algorithm: 'RS256' } });
    const verificador = new JwtService({ publicKey: b.publicKey });
    await expect(verificador.verifyAsync(await firmador.signAsync({ sub: 'u1' }), { algorithms: ['RS256'] })).rejects.toThrow();
  });

  it('un token vencido se rechaza', async () => {
    const k = resolveKeys(cfg({}));
    const jwt = new JwtService({ privateKey: k.privateKey, publicKey: k.publicKey, signOptions: { algorithm: 'RS256', expiresIn: '-10s' } });
    await expect(jwt.verifyAsync(await jwt.signAsync({ sub: 'u1' }), { algorithms: ['RS256'] })).rejects.toThrow(/expired/);
  });
});
