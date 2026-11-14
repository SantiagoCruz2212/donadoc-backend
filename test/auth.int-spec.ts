import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { api, crearApp, crearSesion, firmar, ipAleatoria, Sesion } from './helpers';

describe('Autenticación y autorización (API + PostgreSQL reales)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let s: Sesion;
  const login = (clave: string | undefined, cuerpo: Record<string, unknown>, ip = ipAleatoria()) => {
    const r = request(app.getHttpServer()).post('/api/v1/auth/login').set('X-Forwarded-For', ip);
    if (clave) r.set('X-Tenant-Key', clave);
    return r.send(cuerpo);
  };

  beforeAll(async () => {
    app = await crearApp();
    ds = app.get(DataSource);
    s = await crearSesion(app);
  });
  afterAll(() => app.close());

  it('login correcto devuelve 200 con un JWT firmado con RS256 y el usuario sin datos sensibles', async () => {
    const r = await login(s.org.clave, { correo: s.correo, clave: s.clavePlana });
    expect(r.status).toBe(200);
    const [cabecera, carga] = r.body.data.accessToken.split('.').slice(0, 2).map((p: string) => JSON.parse(Buffer.from(p, 'base64url').toString()));
    expect(cabecera.alg).toBe('RS256');
    expect(carga).toMatchObject({ sub: s.userId, org: s.org.id, rol: 'OPERADOR', typ: 'staff' });
    expect(JSON.stringify(r.body)).not.toMatch(/hash|clave/i);
  });

  it('el correo no distingue mayúsculas', async () => {
    const r = await login(s.org.clave, { correo: s.correo.toUpperCase(), clave: s.clavePlana });
    expect(r.status).toBe(200);
  });

  it('clave incorrecta → 401 «Credenciales inválidas»', async () => {
    const r = await login(s.org.clave, { correo: s.correo, clave: 'incorrecta' });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ success: false, message: 'Credenciales inválidas' });
  });

  it('correo inexistente, clave incorrecta y organización inexistente responden exactamente igual (anti-enumeración)', async () => {
    const a = await login(s.org.clave, { correo: 'nadie@prueba.local', clave: 'x' });
    const b = await login(s.org.clave, { correo: s.correo, clave: 'x' });
    const c = await login('pk_que_no_existe', { correo: s.correo, clave: s.clavePlana });
    expect([a.status, b.status, c.status]).toEqual([401, 401, 401]);
    expect(a.body).toEqual(b.body);
    expect(b.body).toEqual(c.body);
  });

  it('sin la cabecera X-Tenant-Key → 400', async () => {
    const r = await login(undefined, { correo: s.correo, clave: s.clavePlana });
    expect(r.status).toBe(400);
  });

  it('una organización suspendida no puede iniciar sesión (401)', async () => {
    const susp = await crearSesion(app, { estadoOrg: 'SUSPENDIDA' });
    const r = await login(susp.org.clave, { correo: susp.correo, clave: susp.clavePlana });
    expect(r.status).toBe(401);
  });

  it('un usuario eliminado lógicamente no puede iniciar sesión', async () => {
    const otro = await crearSesion(app);
    await ds.query('UPDATE usuarios SET eliminado_en = now() WHERE id = $1', [otro.userId]);
    expect((await login(otro.org.clave, { correo: otro.correo, clave: otro.clavePlana })).status).toBe(401);
  });

  it('un usuario inactivo no puede iniciar sesión', async () => {
    const otro = await crearSesion(app);
    await ds.query("UPDATE usuarios SET estado = 'INACTIVO' WHERE id = $1", [otro.userId]);
    expect((await login(otro.org.clave, { correo: otro.correo, clave: otro.clavePlana })).status).toBe(401);
  });

  it('un usuario no puede entrar con la clave de OTRA organización', async () => {
    const otra = await crearSesion(app);
    expect((await login(otra.org.clave, { correo: s.correo, clave: s.clavePlana })).status).toBe(401);
  });

  it('el cuerpo del login se valida: correo mal formado → 400 con detalle por campo', async () => {
    const r = await login(s.org.clave, { correo: 'no-es-correo', clave: 'x' });
    expect(r.status).toBe(400);
    expect(r.body.error[0].property).toBe('correo');
  });

  it('el login rechaza campos no declarados (forbidNonWhitelisted)', async () => {
    const r = await login(s.org.clave, { correo: s.correo, clave: s.clavePlana, rol: 'SUPER_ADMIN' });
    expect(r.status).toBe(400);
  });

  it('una ruta protegida sin token → 401', async () => {
    expect((await api(app).get('/casos')).status).toBe(401);
  });

  it('una ruta protegida con un token manipulado → 401', async () => {
    expect((await api(app, s.token.slice(0, -4) + 'abcd').get('/casos')).status).toBe(401);
  });

  it('una ruta protegida con un token basura → 401', async () => {
    expect((await api(app, 'esto.no.es-un-jwt').get('/casos')).status).toBe(401);
  });

  it('un token vencido → 401', async () => {
    const vencido = await firmar(app, { sub: s.userId, org: s.org.id, rol: 'OPERADOR', typ: 'staff' }, { expiresIn: '-10s' });
    expect((await api(app, vencido).get('/casos')).status).toBe(401);
  });

  it('un token válido pero de otra audiencia (typ distinto a staff) → 401', async () => {
    const token = await firmar(app, { sub: s.userId, org: s.org.id, rol: 'OPERADOR', typ: 'client' });
    expect((await api(app, token).get('/casos')).status).toBe(401);
  });

  it('un rol sin permiso sobre los casos (SUPER_ADMIN, sin organización) → 403', async () => {
    const sa = await crearSesion(app, { rol: 'SUPER_ADMIN' });
    const r = await api(app, sa.token).get('/casos');
    expect(r.status).toBe(403);
    expect(r.body.message).toBe('No tiene permiso para esta acción');
  });

  it('los roles ADMIN_ORG y OPERADOR sí acceden a los casos', async () => {
    const adm = await crearSesion(app, { rol: 'ADMIN_ORG' });
    expect((await api(app, adm.token).get('/casos')).status).toBe(200);
    expect((await api(app, s.token).get('/casos')).status).toBe(200);
  });

  it('el inicio de sesión (correcto y fallido) queda registrado en la auditoría con la IP', async () => {
    const o = await crearSesion(app);
    await login(o.org.clave, { correo: o.correo, clave: 'mala' }, '203.0.113.7');
    await login(o.org.clave, { correo: o.correo, clave: o.clavePlana }, '203.0.113.8');
    const filas = await ds.query("SELECT accion, ip FROM auditoria WHERE organizacion_id = $1 AND entidad = 'sesion' ORDER BY creado_en", [o.org.id]);
    const acciones = filas.map((f: { accion: string }) => f.accion);
    expect(acciones).toEqual(expect.arrayContaining(['LOGIN', 'LOGIN_FALLIDO']));
    expect(filas.map((f: { ip: string }) => f.ip)).toEqual(expect.arrayContaining(['203.0.113.7', '203.0.113.8']));
  });

  it('el límite del login es de 10 intentos por minuto por IP: el 11.º recibe 429', async () => {
    const ip = '198.51.100.99';
    const estados: number[] = [];
    for (let i = 0; i < 11; i++) estados.push((await login(s.org.clave, { correo: s.correo, clave: 'mala' }, ip)).status);
    expect(estados.slice(0, 10).every((e) => e === 401)).toBe(true);
    expect(estados[10]).toBe(429);
  });
});
