import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { api, crearApp, crearSesion, ipAleatoria, Sesion } from './helpers';

describe('Seguridad HTTP, formato de respuesta y salud (API real)', () => {
  let app: INestApplication;
  let s: Sesion;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await crearApp();
    s = await crearSesion(app);
  });
  afterAll(() => app.close());

  describe('salud', () => {
    it('GET /health (liveness) → 200 {status: ok}, sin autenticación y fuera del prefijo /api/v1', async () => {
      const r = await http().get('/health').set('X-Forwarded-For', ipAleatoria());
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ status: 'ok' });
    });

    it('GET /health/ready (readiness) → 200 con PostgreSQL disponible', async () => {
      const r = await http().get('/health/ready').set('X-Forwarded-For', ipAleatoria());
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({ status: 'ok', info: { postgres: { status: 'up' } } });
    });
  });

  describe('cabeceras de seguridad y CORS', () => {
    it('incluye las cabeceras de seguridad de helmet', async () => {
      const r = await http().get('/health').set('X-Forwarded-For', ipAleatoria());
      expect(r.headers['x-content-type-options']).toBe('nosniff');
      expect(r.headers['x-frame-options']).toBeDefined();
      expect(r.headers['strict-transport-security']).toBeDefined();
      expect(r.headers['x-powered-by']).toBeUndefined(); // no revela el framework
    });

    it('CORS permite el origen del frontend configurado', async () => {
      const r = await http().options('/api/v1/casos').set('X-Forwarded-For', ipAleatoria()).set('Origin', 'http://localhost:8080').set('Access-Control-Request-Method', 'GET');
      expect(r.headers['access-control-allow-origin']).toBe('http://localhost:8080');
    });

    it('CORS no autoriza un origen desconocido', async () => {
      const r = await http().options('/api/v1/casos').set('X-Forwarded-For', ipAleatoria()).set('Origin', 'http://sitio-malicioso.example').set('Access-Control-Request-Method', 'GET');
      expect(r.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('manejo uniforme de errores (sin filtrar detalles internos)', () => {
    it('una ruta que no existe responde 404 en el formato único', async () => {
      const r = await api(app, s.token).get('/ruta-que-no-existe');
      expect(r.status).toBe(404);
      expect(r.body.success).toBe(false);
    });

    it('un método no soportado no devuelve trazas', async () => {
      const r = await api(app, s.token).raw().delete('/api/v1/casos').set('Authorization', `Bearer ${s.token}`).set('X-Forwarded-For', ipAleatoria());
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(JSON.stringify(r.body) + r.text).not.toMatch(/at .*\.(ts|js):\d+/);
    });

    it('un cuerpo JSON mal formado responde 400 en el formato único, sin traza de la pila', async () => {
      const r = await api(app, s.token).post('/casos').set('Content-Type', 'application/json').send('{"donante": {');
      expect(r.status).toBe(400);
      expect(r.text).not.toMatch(/at .*(node_modules|\.js:\d+)/);
      expect(r.body).toMatchObject({ success: false });
    });

    it('un cuerpo JSON demasiado grande responde 413 en el formato único', async () => {
      const r = await api(app, s.token).post('/casos').set('Content-Type', 'application/json').send(JSON.stringify({ texto: 'a'.repeat(300_000) }));
      expect(r.status).toBe(413);
      expect(r.body).toMatchObject({ success: false });
    });

    it('los errores del servidor no exponen detalles internos (rutas, SQL, contraseñas)', async () => {
      const ds = app.get(DataSource);
      const espia = jest.spyOn(ds.manager, 'createQueryBuilder').mockImplementation(() => { throw new Error('select * from casos; password=secreta; C:\\Users\\x\\secreto.ts'); });
      const r = await api(app, s.token).get('/casos');
      espia.mockRestore();
      expect(r.status).toBe(500);
      expect(JSON.stringify(r.body)).not.toMatch(/secreta|select|secreto/i);
      expect(r.body).toEqual({ success: false, message: 'Error interno del servidor' });
    });
  });

  describe('límite de solicitudes', () => {
    it('más de 60 solicitudes por minuto desde una misma IP reciben 429', async () => {
      const ip = '192.0.2.200';
      const estados: number[] = [];
      for (let i = 0; i < 62; i++) estados.push((await http().get('/health').set('X-Forwarded-For', ip)).status);
      expect(estados.slice(0, 60).every((e) => e === 200)).toBe(true);
      expect(estados.slice(60).every((e) => e === 429)).toBe(true);
    });

    it('el límite es por IP: otra IP no se ve afectada', async () => {
      expect((await http().get('/health').set('X-Forwarded-For', '192.0.2.201')).status).toBe(200);
    });
  });

  it('el formato de respuesta de éxito es siempre { success, message, data, meta? }', async () => {
    const r = await api(app, s.token).get('/casos');
    expect(r.body).toEqual(expect.objectContaining({ success: true, message: 'Casos consultados', data: expect.any(Array), meta: expect.any(Object) }));
  });
});
