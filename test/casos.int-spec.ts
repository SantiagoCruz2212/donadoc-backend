import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { api, crearApp, crearCaso, crearSesion, donanteAleatorio, Sesion } from './helpers';

describe('Casos y donantes (API + PostgreSQL reales)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let s: Sesion;

  beforeAll(async () => {
    app = await crearApp();
    ds = app.get(DataSource);
    s = await crearSesion(app);
  });
  afterAll(() => app.close());

  it('POST /casos crea el caso en BORRADOR con su donante (201) y lo persiste', async () => {
    const donante = donanteAleatorio();
    const r = await api(app, s.token).post('/casos').send({ donante, tipoDonante: 'TOTIPOTENCIAL', muerteViolenta: false });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ success: true, message: 'Caso creado', data: { estado: 'BORRADOR', tipoDonante: 'TOTIPOTENCIAL', donante: { numeroDocumento: donante.numeroDocumento } } });
    const [fila] = await ds.query('SELECT organizacion_id, creado_por, estado FROM casos WHERE id = $1', [r.body.data.id]);
    expect(fila).toEqual({ organizacion_id: s.org.id, creado_por: s.userId, estado: 'BORRADOR' });
  });

  it('la respuesta no expone campos internos (organización, creador)', async () => {
    const c = await api(app, s.token).post('/casos').send({ donante: donanteAleatorio() });
    expect(Object.keys(c.body.data).sort()).toEqual(['creadoEn', 'donante', 'estado', 'id', 'muerteViolenta', 'tipoDonante']);
  });

  it('las fechas se devuelven en la zona horaria de negocio con su desfase (-05:00)', async () => {
    const c = await api(app, s.token).post('/casos').send({ donante: donanteAleatorio() });
    expect(c.body.data.creadoEn).toMatch(/T\d{2}:\d{2}:\d{2}\.\d{3}-05:00$/);
  });

  it('un mismo donante en dos casos reutiliza el registro del donante (no se duplica)', async () => {
    const donante = donanteAleatorio();
    const a = await api(app, s.token).post('/casos').send({ donante });
    const b = await api(app, s.token).post('/casos').send({ donante });
    expect(a.body.data.donante.id).toBe(b.body.data.donante.id);
    expect(a.body.data.id).not.toBe(b.body.data.id);
    const [{ n }] = await ds.query('SELECT count(*)::int n FROM donantes WHERE organizacion_id = $1 AND numero_documento = $2', [s.org.id, donante.numeroDocumento]);
    expect(n).toBe(1);
  });

  it('el mismo número de documento en OTRA organización es otro donante', async () => {
    const otra = await crearSesion(app);
    const donante = donanteAleatorio();
    const a = await api(app, s.token).post('/casos').send({ donante });
    const b = await api(app, otra.token).post('/casos').send({ donante });
    expect(a.body.data.donante.id).not.toBe(b.body.data.donante.id);
  });

  describe('validación de entrada (400 con detalle por campo)', () => {
    const casos: [string, Record<string, unknown>, string][] = [
      ['tipo de documento desconocido', { donante: donanteAleatorio({ tipoDocumento: 'XX' }) }, 'donante.tipoDocumento'],
      ['número de documento demasiado corto', { donante: donanteAleatorio({ numeroDocumento: '12' }) }, 'donante.numeroDocumento'],
      ['número de documento con caracteres inválidos', { donante: donanteAleatorio({ numeroDocumento: '12 34;--' }) }, 'donante.numeroDocumento'],
      ['nombres vacíos', { donante: donanteAleatorio({ nombres: '' }) }, 'donante.nombres'],
      ['apellidos de más de 120 caracteres', { donante: donanteAleatorio({ apellidos: 'a'.repeat(121) }) }, 'donante.apellidos'],
      ['sexo no permitido', { donante: donanteAleatorio({ sexo: 'X' }) }, 'donante.sexo'],
      ['fecha de nacimiento inválida', { donante: donanteAleatorio({ fechaNacimiento: 'ayer' }) }, 'donante.fechaNacimiento'],
      ['tipo de donante desconocido', { donante: donanteAleatorio(), tipoDonante: 'OTRO' }, 'tipoDonante'],
      ['muerteViolenta que no es booleano', { donante: donanteAleatorio(), muerteViolenta: 'si' }, 'muerteViolenta'],
    ];
    it.each(casos)('%s', async (_n, cuerpo, campo) => {
      const r = await api(app, s.token).post('/casos').send(cuerpo);
      expect(r.status).toBe(400);
      expect(r.body.success).toBe(false);
      expect(r.body.error.map((e: { property: string }) => e.property)).toContain(campo);
    });

    it('un campo no declarado se rechaza (forbidNonWhitelisted)', async () => {
      const r = await api(app, s.token).post('/casos').send({ donante: donanteAleatorio(), organizacionId: 'otra' });
      expect(r.status).toBe(400);
    });

    it('un cuerpo vacío se rechaza', async () => {
      expect((await api(app, s.token).post('/casos').send({})).status).toBe(400);
    });

    it('una solicitud inválida no deja ningún donante ni caso a medias', async () => {
      const donante = donanteAleatorio({ sexo: 'X' });
      await api(app, s.token).post('/casos').send({ donante });
      const [{ n }] = await ds.query('SELECT count(*)::int n FROM donantes WHERE numero_documento = $1', [donante.numeroDocumento]);
      expect(n).toBe(0);
    });
  });

  it('GET /casos/{id} devuelve el caso (200)', async () => {
    const c = await crearCaso(app, s.token);
    const r = await api(app, s.token).get(`/casos/${c.id}`);
    expect(r.status).toBe(200);
    expect(r.body.data.id).toBe(c.id);
  });

  it('GET /casos/{id} con un identificador que no es UUID → 400', async () => {
    expect((await api(app, s.token).get('/casos/no-es-un-uuid')).status).toBe(400);
  });

  it('GET /casos/{id} inexistente → 404', async () => {
    const r = await api(app, s.token).get('/casos/00000000-0000-4000-8000-000000000000');
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ success: false, message: 'Caso no encontrado' });
  });

  it('un caso eliminado lógicamente aparece como no encontrado', async () => {
    const c = await crearCaso(app, s.token);
    await ds.query('UPDATE casos SET eliminado_en = now() WHERE id = $1', [c.id]);
    expect((await api(app, s.token).get(`/casos/${c.id}`)).status).toBe(404);
  });

  describe('aislamiento entre organizaciones', () => {
    it('otra organización no puede consultar el caso (404) ni verlo en su listado', async () => {
      const otra = await crearSesion(app);
      const c = await crearCaso(app, s.token);
      expect((await api(app, otra.token).get(`/casos/${c.id}`)).status).toBe(404);
      const lista = await api(app, otra.token).get('/casos');
      expect(lista.body.data.map((x: { id: string }) => x.id)).not.toContain(c.id);
      expect(lista.body.meta.total).toBe(0);
    });
  });

  describe('listado paginado', () => {
    let p: Sesion;
    beforeAll(async () => {
      p = await crearSesion(app);
      for (let i = 0; i < 7; i++) await crearCaso(app, p.token);
    });

    it('devuelve la primera página con sus metadatos', async () => {
      const r = await api(app, p.token).get('/casos?page=1&pageSize=3');
      expect(r.status).toBe(200);
      expect(r.body.data).toHaveLength(3);
      expect(r.body.meta).toEqual({ page: 1, pageSize: 3, total: 7, totalPages: 3 });
    });

    it('la última página trae el resto', async () => {
      const r = await api(app, p.token).get('/casos?page=3&pageSize=3');
      expect(r.body.data).toHaveLength(1);
    });

    it('una página fuera de rango devuelve una lista vacía con el total correcto', async () => {
      const r = await api(app, p.token).get('/casos?page=99&pageSize=3');
      expect(r.status).toBe(200);
      expect(r.body.data).toEqual([]);
      expect(r.body.meta.total).toBe(7);
    });

    it('ordena del más reciente al más antiguo', async () => {
      const r = await api(app, p.token).get('/casos?pageSize=100');
      const fechas = r.body.data.map((x: { creadoEn: string }) => Date.parse(x.creadoEn));
      expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
    });

    it('filtra por estado', async () => {
      const c = await crearCaso(app, p.token);
      await ds.query("UPDATE casos SET estado = 'CERRADO' WHERE id = $1", [c.id]);
      const r = await api(app, p.token).get('/casos?estado=CERRADO');
      expect(r.body.data.map((x: { id: string }) => x.id)).toEqual([c.id]);
    });

    it.each([['page=0'], ['page=-1'], ['pageSize=0'], ['pageSize=101'], ['pageSize=abc'], ['estado=INVENTADO']])('el parámetro inválido «%s» → 400', async (q) => {
      expect((await api(app, p.token).get(`/casos?${q}`)).status).toBe(400);
    });
  });

  it('la creación de un caso queda registrada en la auditoría', async () => {
    const c = await crearCaso(app, s.token);
    const filas = await ds.query("SELECT accion, usuario_id FROM auditoria WHERE entidad = 'caso' AND entidad_id = $1", [c.id]);
    expect(filas).toEqual([{ accion: 'CREAR', usuario_id: s.userId }]);
  });
});
