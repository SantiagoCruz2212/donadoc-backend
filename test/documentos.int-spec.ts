import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { api, crearApp, crearCaso, crearSesion, HISTORIA, Sesion } from './helpers';

const PDF = readFileSync(resolve(__dirname, '../docs/ejemplos/historia_clinica_sintetica.pdf'));

describe('Documentos: carga de historias clínicas externas (API + PostgreSQL + almacenamiento reales)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let s: Sesion;
  let casoId: string;

  beforeAll(async () => {
    app = await crearApp();
    ds = app.get(DataSource);
    s = await crearSesion(app);
    casoId = (await crearCaso(app, s.token)).id;
  });
  afterAll(() => app.close());

  it('registrar texto pegado → 201, guardado en disco y en la base con su huella SHA-256', async () => {
    const r = await api(app, s.token).post(`/casos/${casoId}/documentos/texto`).send({ texto: HISTORIA });
    expect(r.status).toBe(201);
    const esperado = createHash('sha256').update(HISTORIA, 'utf8').digest('hex');
    expect(r.body.data).toMatchObject({ casoId, tipo: 'HISTORIA_EXTERNA', estado: 'COMPLETO', nombreArchivo: 'historia-pegada.txt', hashSha256: esperado });
    const [fila] = await ds.query('SELECT ruta_archivo, hash_sha256 FROM documentos WHERE id = $1', [r.body.data.id]);
    expect(fila.hash_sha256).toBe(esperado);
    expect(readFileSync(join(process.env.UPLOAD_DIR as string, fila.ruta_archivo), 'utf8')).toBe(HISTORIA);
  });

  it('la respuesta nunca expone la ruta interna del archivo', async () => {
    const r = await api(app, s.token).post(`/casos/${casoId}/documentos/texto`).send({ texto: 'Diagnóstico: x' });
    expect(r.body.data).not.toHaveProperty('rutaArchivo');
    expect(JSON.stringify(r.body)).not.toContain(process.env.UPLOAD_DIR as string);
    expect(JSON.stringify(r.body)).not.toContain(casoId + '/');
  });

  it('cargar un archivo .txt → 201', async () => {
    const r = await api(app, s.token).post(`/casos/${casoId}/documentos`).attach('archivo', Buffer.from(HISTORIA), { filename: 'historia.txt', contentType: 'text/plain' });
    expect(r.status).toBe(201);
    expect(r.body.data.nombreArchivo).toBe('historia.txt');
  });

  it('cargar un archivo .pdf válido → 201', async () => {
    const r = await api(app, s.token).post(`/casos/${casoId}/documentos`).attach('archivo', PDF, { filename: 'historia.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(201);
    expect(r.body.data.hashSha256).toBe(createHash('sha256').update(PDF).digest('hex'));
  });

  it('un archivo .exe se rechaza con 422 y no queda nada guardado', async () => {
    const antes = await ds.query('SELECT count(*)::int n FROM documentos WHERE caso_id = $1', [casoId]);
    const r = await api(app, s.token).post(`/casos/${casoId}/documentos`).attach('archivo', Buffer.from('MZ'), { filename: 'malo.exe', contentType: 'application/x-msdownload' });
    expect(r.status).toBe(422);
    const despues = await ds.query('SELECT count(*)::int n FROM documentos WHERE caso_id = $1', [casoId]);
    expect(despues[0].n).toBe(antes[0].n);
  });

  it('un .pdf con tipo MIME de texto (extensión engañosa) se rechaza con 422', async () => {
    const r = await api(app, s.token).post(`/casos/${casoId}/documentos`).attach('archivo', Buffer.from('hola'), { filename: 'falso.pdf', contentType: 'text/plain' });
    expect(r.status).toBe(422);
  });

  it('sin archivo → 400', async () => {
    const r = await api(app, s.token).post(`/casos/${casoId}/documentos`).field('otro', 'x');
    expect(r.status).toBe(400);
  });

  it('un archivo de más de 5 MB se rechaza con 413', async () => {
    const grande = Buffer.alloc(5 * 1024 * 1024 + 10, 'a');
    const r = await api(app, s.token).post(`/casos/${casoId}/documentos`).attach('archivo', grande, { filename: 'grande.txt', contentType: 'text/plain' });
    expect(r.status).toBe(413);
  });

  it('un nombre de archivo malicioso (../) no permite escribir fuera de la carpeta de cargas', async () => {
    const r = await api(app, s.token).post(`/casos/${casoId}/documentos`).attach('archivo', Buffer.from('x'), { filename: '../../escape.txt', contentType: 'text/plain' });
    expect(r.status).toBe(201);
    const [fila] = await ds.query('SELECT ruta_archivo FROM documentos WHERE id = $1', [r.body.data.id]);
    expect(existsSync(join(process.env.UPLOAD_DIR as string, fila.ruta_archivo))).toBe(true);
    expect(existsSync(resolve(process.env.UPLOAD_DIR as string, '..', 'escape.txt'))).toBe(false);
  });

  it('el texto pegado vacío se rechaza (400)', async () => {
    expect((await api(app, s.token).post(`/casos/${casoId}/documentos/texto`).send({ texto: '' })).status).toBe(400);
  });

  it('el texto pegado de más de 50.000 caracteres se rechaza (400)', async () => {
    expect((await api(app, s.token).post(`/casos/${casoId}/documentos/texto`).send({ texto: 'a'.repeat(50001) })).status).toBe(400);
  });

  it('listar devuelve los documentos del caso, del más reciente al más antiguo', async () => {
    const r = await api(app, s.token).get(`/casos/${casoId}/documentos`);
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBeGreaterThanOrEqual(3);
    const fechas = r.body.data.map((d: { creadoEn: string }) => Date.parse(d.creadoEn));
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
  });

  it('un documento eliminado lógicamente no aparece en el listado', async () => {
    const d = await api(app, s.token).post(`/casos/${casoId}/documentos/texto`).send({ texto: 'borrar' });
    await ds.query('UPDATE documentos SET eliminado_en = now() WHERE id = $1', [d.body.data.id]);
    const r = await api(app, s.token).get(`/casos/${casoId}/documentos`);
    expect(r.body.data.map((x: { id: string }) => x.id)).not.toContain(d.body.data.id);
  });

  it('cargar un documento en un caso de OTRA organización → 404 y no se guarda nada', async () => {
    const otra = await crearSesion(app);
    const antes = await ds.query('SELECT count(*)::int n FROM documentos WHERE caso_id = $1', [casoId]);
    const r = await api(app, otra.token).post(`/casos/${casoId}/documentos/texto`).send({ texto: 'intruso' });
    expect(r.status).toBe(404);
    const despues = await ds.query('SELECT count(*)::int n FROM documentos WHERE caso_id = $1', [casoId]);
    expect(despues[0].n).toBe(antes[0].n);
  });

  it('listar los documentos de un caso de OTRA organización → 404', async () => {
    const otra = await crearSesion(app);
    expect((await api(app, otra.token).get(`/casos/${casoId}/documentos`)).status).toBe(404);
  });

  it('el identificador de caso debe ser un UUID (400)', async () => {
    expect((await api(app, s.token).get('/casos/123/documentos')).status).toBe(400);
  });

  it('sin sesión → 401', async () => {
    expect((await api(app).get(`/casos/${casoId}/documentos`)).status).toBe(401);
  });

  it('cada carga queda registrada en la auditoría', async () => {
    const d = await api(app, s.token).post(`/casos/${casoId}/documentos/texto`).send({ texto: 'auditar' });
    const filas = await ds.query("SELECT accion FROM auditoria WHERE entidad = 'documento' AND entidad_id = $1", [d.body.data.id]);
    expect(filas).toEqual([{ accion: 'CREAR' }]);
  });
});
