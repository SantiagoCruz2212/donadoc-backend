import { readFileSync, readdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { descifrarTexto } from '../src/common/crypto/campo-cifrado';
import { ExtractorIa, ExtractorIaError, ResultadoExtraccion, SolicitudExtraccion } from '../src/ia/ports/extractor-ia.port';
import { api, crearApp, crearCaso, crearSesion, HISTORIA, Sesion, subirTexto } from './helpers';

const PDF = readFileSync(resolve(__dirname, '../docs/ejemplos/historia_clinica_sintetica.pdf'));
const extraer = (app: INestApplication, token: string, casoId: string, documentoOrigenId: string) => api(app, token).post(`/casos/${casoId}/extracciones-ia`).send({ documentoOrigenId });

describe('Extracción con IA, flujo completo con el simulador (API + PostgreSQL + almacenamiento reales)', () => {
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

  it('extraer de un texto → 201 PROCESADA con 5 sugerencias pendientes de revisión', async () => {
    const doc = await subirTexto(app, s.token, casoId);
    const r = await extraer(app, s.token, casoId, doc.id);
    expect(r.status).toBe(201);
    expect(r.body.message).toBe('Extracción procesada; las sugerencias requieren revisión');
    expect(r.body.data).toMatchObject({ estado: 'PROCESADA', proveedor: 'MOCK', intentos: 1, casoId, documentoOrigenId: doc.id });
    expect(r.body.data.sugerencias.map((x: { campo: string }) => x.campo).sort()).toEqual(['antecedentesRelevantes', 'causaMuerte', 'diagnosticoPrincipal', 'fechaIngreso', 'grupoSanguineo']);
    expect(r.body.data.sugerencias.every((x: { decision: string; confianza: number }) => x.decision === 'PENDIENTE' && x.confianza >= 0.7)).toBe(true);
  });

  it('el resultado queda persistido: extracción y sugerencias en la base de datos', async () => {
    const doc = await subirTexto(app, s.token, casoId);
    const r = await extraer(app, s.token, casoId, doc.id);
    const [e] = await ds.query('SELECT estado, proveedor, intentos, solicitado_por FROM extracciones_ia WHERE id = $1', [r.body.data.id]);
    expect(e).toEqual({ estado: 'PROCESADA', proveedor: 'MOCK', intentos: 1, solicitado_por: s.userId });
    const [{ n }] = await ds.query('SELECT count(*)::int n FROM sugerencias_ia WHERE extraccion_id = $1', [r.body.data.id]);
    expect(n).toBe(5);
  });

  it('extraer de un PDF real (lectura con pdf-parse) → 201 PROCESADA', async () => {
    const d = await api(app, s.token).post(`/casos/${casoId}/documentos`).attach('archivo', PDF, { filename: 'historia.pdf', contentType: 'application/pdf' });
    const r = await extraer(app, s.token, casoId, d.body.data.id);
    expect(r.status).toBe(201);
    expect(r.body.data.estado).toBe('PROCESADA');
    expect(r.body.data.sugerencias.length).toBeGreaterThanOrEqual(3);
  });

  it('un texto sin ningún dato reconocible → ABSTENCION, sin sugerencias', async () => {
    const doc = await subirTexto(app, s.token, casoId, 'Paciente estable. Sin novedades relevantes en el turno.');
    const r = await extraer(app, s.token, casoId, doc.id);
    expect(r.status).toBe(201);
    expect(r.body.message).toBe('Confianza insuficiente; capture los datos manualmente');
    expect(r.body.data).toMatchObject({ estado: 'ABSTENCION', sugerencias: [] });
  });

  it('GET de una extracción devuelve su estado y sus sugerencias', async () => {
    const doc = await subirTexto(app, s.token, casoId);
    const c = await extraer(app, s.token, casoId, doc.id);
    const r = await api(app, s.token).get(`/extracciones-ia/${c.body.data.id}`);
    expect(r.status).toBe(200);
    expect(r.body.data.sugerencias).toHaveLength(5);
  });

  it('GET de las extracciones de un caso las devuelve de la más reciente a la más antigua', async () => {
    const r = await api(app, s.token).get(`/casos/${casoId}/extracciones-ia`);
    expect(r.status).toBe(200);
    const fechas = r.body.data.map((e: { solicitadoEn: string }) => Date.parse(e.solicitadoEn));
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
  });

  it('extraer con un documento que no existe → 404', async () => {
    expect((await extraer(app, s.token, casoId, '00000000-0000-4000-8000-000000000000')).status).toBe(404);
  });

  it('extraer con un documentoOrigenId que no es UUID → 400', async () => {
    expect((await extraer(app, s.token, casoId, 'abc')).status).toBe(400);
  });

  it('extraer con un documento de OTRO caso → 404', async () => {
    const otroCaso = await crearCaso(app, s.token);
    const doc = await subirTexto(app, s.token, otroCaso.id);
    expect((await extraer(app, s.token, casoId, doc.id)).status).toBe(404);
  });

  describe('revisión humana de sugerencias (persistida y auditada)', () => {
    let sug: { id: string; valorSugerido: string }[];
    beforeAll(async () => {
      const doc = await subirTexto(app, s.token, casoId);
      sug = (await extraer(app, s.token, casoId, doc.id)).body.data.sugerencias;
    });

    it('ACEPTADA → 200 y el valor final es el sugerido, guardado en la base', async () => {
      const r = await api(app, s.token).patch(`/sugerencias-ia/${sug[0].id}`).send({ decision: 'ACEPTADA' });
      expect(r.status).toBe(200);
      expect(r.body.data).toMatchObject({ decision: 'ACEPTADA', valorFinal: sug[0].valorSugerido });
      const [f] = await ds.query('SELECT decision, valor_final, decidido_por, decidido_en FROM sugerencias_ia WHERE id = $1', [sug[0].id]);
      expect(f).toMatchObject({ decision: 'ACEPTADA', decidido_por: s.userId });
      expect(descifrarTexto(f.valor_final)).toBe(sug[0].valorSugerido); // en la base está cifrado (ver cifrado.int-spec.ts)
      expect(f.decidido_en).toBeInstanceOf(Date);
    });

    it('MODIFICADA con valor → 200 y se guarda el valor corregido', async () => {
      const r = await api(app, s.token).patch(`/sugerencias-ia/${sug[1].id}`).send({ decision: 'MODIFICADA', valorFinal: 'Valor corregido por la persona' });
      expect(r.status).toBe(200);
      expect(r.body.data.valorFinal).toBe('Valor corregido por la persona');
    });

    it('MODIFICADA sin valorFinal → 400', async () => {
      const r = await api(app, s.token).patch(`/sugerencias-ia/${sug[2].id}`).send({ decision: 'MODIFICADA' });
      expect(r.status).toBe(400);
      expect(r.body.error[0].property).toBe('valorFinal');
    });

    it('RECHAZADA → 200 y el valor final queda nulo', async () => {
      const r = await api(app, s.token).patch(`/sugerencias-ia/${sug[3].id}`).send({ decision: 'RECHAZADA' });
      expect(r.body.data).toMatchObject({ decision: 'RECHAZADA', valorFinal: null });
    });

    it('revisar de nuevo una sugerencia ya revisada → 409', async () => {
      const r = await api(app, s.token).patch(`/sugerencias-ia/${sug[0].id}`).send({ decision: 'RECHAZADA' });
      expect(r.status).toBe(409);
    });

    it('una decisión que no existe → 400', async () => {
      expect((await api(app, s.token).patch(`/sugerencias-ia/${sug[4].id}`).send({ decision: 'TAL_VEZ' })).status).toBe(400);
    });

    it('una sugerencia inexistente → 404', async () => {
      expect((await api(app, s.token).patch('/sugerencias-ia/00000000-0000-4000-8000-000000000000').send({ decision: 'ACEPTADA' })).status).toBe(404);
    });

    it('la decisión queda en la auditoría con el valor anterior y el nuevo', async () => {
      const filas = await ds.query("SELECT accion, valor_anterior, valor_nuevo FROM auditoria WHERE entidad = 'sugerencia_ia' AND entidad_id = $1", [sug[0].id]);
      expect(filas[0].accion).toBe('EDITAR');
      expect(filas[0].valor_anterior).toMatchObject({ decision: 'PENDIENTE' });
      expect(filas[0].valor_nuevo).toMatchObject({ decision: 'ACEPTADA' });
    });

    it('otra organización no puede revisar la sugerencia (404) y esta no cambia', async () => {
      const doc = await subirTexto(app, s.token, casoId);
      const ext = (await extraer(app, s.token, casoId, doc.id)).body.data;
      const otra = await crearSesion(app);
      const r = await api(app, otra.token).patch(`/sugerencias-ia/${ext.sugerencias[0].id}`).send({ decision: 'ACEPTADA' });
      expect(r.status).toBe(404);
      const [f] = await ds.query('SELECT decision FROM sugerencias_ia WHERE id = $1', [ext.sugerencias[0].id]);
      expect(f.decision).toBe('PENDIENTE');
    });
  });

  describe('aislamiento entre organizaciones', () => {
    it('otra organización no puede extraer, consultar ni listar las extracciones de un caso ajeno (404)', async () => {
      const doc = await subirTexto(app, s.token, casoId);
      const ext = (await extraer(app, s.token, casoId, doc.id)).body.data;
      const otra = await crearSesion(app);
      expect((await extraer(app, otra.token, casoId, doc.id)).status).toBe(404);
      expect((await api(app, otra.token).get(`/extracciones-ia/${ext.id}`)).status).toBe(404);
      expect((await api(app, otra.token).get(`/casos/${casoId}/extracciones-ia`)).status).toBe(404);
    });
  });

  it('el caso de uso queda auditado: creación de la extracción y respuesta de la IA', async () => {
    const doc = await subirTexto(app, s.token, casoId);
    const ext = (await extraer(app, s.token, casoId, doc.id)).body.data;
    const filas = await ds.query("SELECT accion FROM auditoria WHERE entidad = 'extraccion_ia' AND entidad_id = $1 ORDER BY creado_en", [ext.id]);
    expect(filas.map((f: { accion: string }) => f.accion)).toEqual(['CREAR', 'IA_RESPUESTA']);
  });
});

/** Proveedores de prueba que reemplazan al puerto ExtractorIa en la aplicación real. */
const proveedor = (extraer: (s: SolicitudExtraccion, signal?: AbortSignal) => Promise<ResultadoExtraccion>): Partial<ExtractorIa> => ({ externo: false, nombre: 'PRUEBA', extraer });

describe('Extracción con IA, fallas del proveedor (se sustituye el puerto ExtractorIa; todo lo demás es real)', () => {
  const casos: { nombre: string; error: ExtractorIaError; estado: string; intentos: number; texto: RegExp }[] = [
    { nombre: 'el proveedor está caído (PROVEEDOR)', error: new ExtractorIaError('PROVEEDOR', 'caído'), estado: 'PENDIENTE', intentos: 2, texto: /no respondió/ },
    { nombre: 'se agotó la cuota (CUOTA)', error: new ExtractorIaError('CUOTA', 'cuota'), estado: 'PENDIENTE', intentos: 1, texto: /límite de uso/ },
    { nombre: 'el proveedor no está configurado (CONFIGURACION)', error: new ExtractorIaError('CONFIGURACION', 'sin clave'), estado: 'PENDIENTE', intentos: 1, texto: /no está configurado/ },
    { nombre: 'la respuesta no es válida (RESPUESTA_INVALIDA)', error: new ExtractorIaError('RESPUESTA_INVALIDA', 'no es JSON'), estado: 'ERROR', intentos: 1, texto: /no fue válida/ },
  ];

  it.each(casos)('cuando $nombre: estado $estado, $intentos intento(s), el documento se conserva', async ({ error, estado, intentos, texto }) => {
    const app = await crearApp(proveedor(async () => { throw error; }));
    try {
      const s = await crearSesion(app);
      const caso = await crearCaso(app, s.token);
      const doc = await subirTexto(app, s.token, caso.id);
      const r = await extraer(app, s.token, caso.id, doc.id);
      expect(r.status).toBe(201); // la falla de la IA no es un error de la API
      expect(r.body.message).toMatch(texto);
      expect(r.body.data).toMatchObject({ estado, intentos, sugerencias: [] });
      const lista = await api(app, s.token).get(`/casos/${caso.id}/documentos`);
      expect(lista.body.data.map((d: { id: string }) => d.id)).toContain(doc.id);
      const filas = await app.get(DataSource).query("SELECT accion FROM auditoria WHERE entidad = 'extraccion_ia' AND entidad_id = $1 ORDER BY creado_en", [r.body.data.id]);
      expect(filas.map((f: { accion: string }) => f.accion)).toEqual(['CREAR', 'IA_FALLO']);
    } finally {
      await app.close();
    }
  });

  it('reintenta tras un fallo transitorio y termina PROCESADA en el segundo intento', async () => {
    let llamadas = 0;
    const app = await crearApp(proveedor(async () => {
      llamadas++;
      if (llamadas === 1) throw new ExtractorIaError('PROVEEDOR', 'falla transitoria');
      return { proveedor: 'PRUEBA', modelo: 'm', sugerencias: [{ campo: 'diagnosticoPrincipal', valor: 'TCE', confianza: 0.9 }] };
    }));
    try {
      const s = await crearSesion(app);
      const caso = await crearCaso(app, s.token);
      const r = await extraer(app, s.token, caso.id, (await subirTexto(app, s.token, caso.id)).id);
      expect(r.body.data).toMatchObject({ estado: 'PROCESADA', intentos: 2 });
      expect(llamadas).toBe(2);
    } finally {
      await app.close();
    }
  });

  it('un proveedor que nunca responde se corta por tiempo límite (2 s × 2 intentos) y queda PENDIENTE', async () => {
    const app = await crearApp(proveedor(() => new Promise(() => undefined)));
    try {
      const s = await crearSesion(app);
      const caso = await crearCaso(app, s.token);
      const t0 = Date.now();
      const r = await extraer(app, s.token, caso.id, (await subirTexto(app, s.token, caso.id)).id);
      expect(r.body.data).toMatchObject({ estado: 'PENDIENTE', intentos: 2 });
      expect(Date.now() - t0).toBeGreaterThanOrEqual(3900);
      expect(Date.now() - t0).toBeLessThan(10000);
    } finally {
      await app.close();
    }
  }, 30000);

  it('PERSISTIR PRIMERO: cuando se llama al proveedor, la extracción PENDIENTE ya existe en la base de datos', async () => {
    let vistoEnBd: { estado: string }[] = [];
    let dsRef: DataSource | undefined;
    const app = await crearApp(proveedor(async () => {
      vistoEnBd = await (dsRef as DataSource).query("SELECT estado FROM extracciones_ia WHERE estado = 'PENDIENTE' ORDER BY solicitado_en DESC LIMIT 1");
      return { proveedor: 'PRUEBA', modelo: 'm', sugerencias: [] };
    }));
    try {
      dsRef = app.get(DataSource);
      const s = await crearSesion(app);
      const caso = await crearCaso(app, s.token);
      await extraer(app, s.token, caso.id, (await subirTexto(app, s.token, caso.id)).id);
      expect(vistoEnBd).toEqual([{ estado: 'PENDIENTE' }]);
    } finally {
      await app.close();
    }
  });

  it('al proveedor se le envía como máximo 12.000 caracteres (control de tokens)', async () => {
    let recibido = 0;
    const app = await crearApp(proveedor(async (sol) => { recibido = sol.texto.length; return { proveedor: 'PRUEBA', modelo: 'm', sugerencias: [] }; }));
    try {
      const s = await crearSesion(app);
      const caso = await crearCaso(app, s.token);
      await extraer(app, s.token, caso.id, (await subirTexto(app, s.token, caso.id, 'x'.repeat(30000))).id);
      expect(recibido).toBe(12000);
    } finally {
      await app.close();
    }
  });

  it('solo las sugerencias con confianza ≥ 70 % se guardan (umbral de abstención)', async () => {
    const app = await crearApp(proveedor(async () => ({
      proveedor: 'PRUEBA', modelo: 'm',
      sugerencias: [{ campo: 'diagnosticoPrincipal', valor: 'TCE', confianza: 0.95 }, { campo: 'causaMuerte', valor: 'duda', confianza: 0.69 }, { campo: 'grupoSanguineo', valor: 'O+', confianza: 0.7 }],
    })));
    try {
      const s = await crearSesion(app);
      const caso = await crearCaso(app, s.token);
      const r = await extraer(app, s.token, caso.id, (await subirTexto(app, s.token, caso.id)).id);
      expect(r.body.data.sugerencias.map((x: { campo: string }) => x.campo).sort()).toEqual(['diagnosticoPrincipal', 'grupoSanguineo']);
    } finally {
      await app.close();
    }
  });

  it('DEF-01: si el archivo del documento desapareció del almacenamiento, la extracción termina en ERROR (no 500, no PENDIENTE eterna)', async () => {
    const app = await crearApp();
    try {
      const s = await crearSesion(app);
      const caso = await crearCaso(app, s.token);
      const doc = await subirTexto(app, s.token, caso.id);
      const [{ ruta_archivo }] = await app.get(DataSource).query('SELECT ruta_archivo FROM documentos WHERE id = $1', [doc.id]);
      rmSync(join(process.env.UPLOAD_DIR as string, ruta_archivo));
      const r = await extraer(app, s.token, caso.id, doc.id);
      expect(r.status).toBe(201);
      expect(r.body.data.estado).toBe('ERROR');
      expect(r.body.message).toMatch(/No se pudo leer el documento/);
      const [e] = await app.get(DataSource).query('SELECT estado FROM extracciones_ia WHERE id = $1', [r.body.data.id]);
      expect(e.estado).toBe('ERROR');
    } finally {
      await app.close();
    }
  });

  it('un PDF dañado (contenido que no es un PDF) termina en ERROR con un mensaje claro', async () => {
    const app = await crearApp();
    try {
      const s = await crearSesion(app);
      const caso = await crearCaso(app, s.token);
      const d = await api(app, s.token).post(`/casos/${caso.id}/documentos`).attach('archivo', Buffer.from('%PDF-1.4 cuerpo corrupto: no es un PDF legible'), { filename: 'roto.pdf', contentType: 'application/pdf' });
      const r = await extraer(app, s.token, caso.id, d.body.data.id);
      expect(r.status).toBe(201);
      expect(r.body.data.estado).toBe('ERROR');
    } finally {
      await app.close();
    }
  });
});
