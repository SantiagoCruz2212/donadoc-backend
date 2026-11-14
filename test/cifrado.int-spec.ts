import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { api, crearApp, crearCaso, crearSesion, Sesion, subirTexto } from './helpers';

const extraer = (app: INestApplication, token: string, casoId: string, documentoOrigenId: string) =>
  api(app, token).post(`/casos/${casoId}/extracciones-ia`).send({ documentoOrigenId });

describe('Cifrado de datos sensibles en PostgreSQL real', () => {
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

  it('las sugerencias de la IA se guardan cifradas en la base y la API las devuelve en claro', async () => {
    const doc = await subirTexto(app, s.token, casoId);
    const r = await extraer(app, s.token, casoId, doc.id);
    expect(r.status).toBe(201);
    const enClaro = r.body.data.sugerencias.map((x: { valorSugerido: string }) => x.valorSugerido);
    expect(enClaro.every((v: string) => !v.startsWith('enc:v1:'))).toBe(true);

    const filas = await ds.query('SELECT valor_sugerido FROM sugerencias_ia WHERE extraccion_id = $1', [r.body.data.id]);
    expect(filas).toHaveLength(5);
    expect(filas.every((f: { valor_sugerido: string }) => f.valor_sugerido.startsWith('enc:v1:'))).toBe(true);
    expect(filas.map((f: { valor_sugerido: string }) => f.valor_sugerido).join('')).not.toContain('Traumatismo');
  });

  it('la respuesta cruda del proveedor de IA (jsonb) se guarda cifrada', async () => {
    const doc = await subirTexto(app, s.token, casoId);
    const r = await extraer(app, s.token, casoId, doc.id);
    const [fila] = await ds.query('SELECT respuesta_json FROM extracciones_ia WHERE id = $1', [r.body.data.id]);
    if (fila.respuesta_json !== null) {
      expect(Object.keys(fila.respuesta_json)).toEqual(['$enc']);
      expect(fila.respuesta_json.$enc.startsWith('enc:v1:')).toBe(true);
    }
  });

  it('un valor antiguo guardado en claro se sigue leyendo (compatibilidad)', async () => {
    const doc = await subirTexto(app, s.token, casoId);
    const r = await extraer(app, s.token, casoId, doc.id);
    const id = r.body.data.sugerencias[0].id as string;
    await ds.query("UPDATE sugerencias_ia SET valor_sugerido = 'valor antiguo sin cifrar' WHERE id = $1", [id]);
    const g = await api(app, s.token).get(`/extracciones-ia/${r.body.data.id}`);
    expect(g.status).toBe(200);
    expect(g.body.data.sugerencias.find((x: { id: string }) => x.id === id).valorSugerido).toBe('valor antiguo sin cifrar');
  });

  it('la causa de muerte admite el dato cifrado: la columna es TEXT (migración)', async () => {
    const [col] = await ds.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'casos' AND column_name = 'causa_muerte'");
    expect(col.data_type).toBe('text');
  });
});
