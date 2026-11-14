import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { crearApp } from './helpers';

const TABLAS = [
  'auditoria', 'casos', 'claves_temporales', 'componentes_caso', 'descripciones_quirurgicas', 'documentos', 'donantes', 'extracciones_ia',
  'firmas', 'informes', 'instituciones', 'invitaciones', 'organizaciones', 'paquete_documentos', 'paquetes', 'plantillas_formato', 'responsables',
  'sugerencias_ia', 'usuarios',
];

describe('Persistencia: migraciones y reglas de integridad en PostgreSQL real', () => {
  let app: INestApplication;
  let ds: DataSource;
  const clave = () => `pk_${randomUUID().slice(0, 12)}`; // única por prueba y por ejecución: la suite se puede repetir
  const org = async (nombre = 'Org') => (await ds.query('INSERT INTO organizaciones (nombre, clave_publica) VALUES ($1,$2) RETURNING id', [nombre, clave()]))[0].id as string;

  beforeAll(async () => {
    app = await crearApp();
    ds = app.get(DataSource);
  });
  afterAll(() => app.close());

  it('las migraciones crean las 18 tablas del modelo entidad-relación más la de informes periódicos (19)', async () => {
    const filas = await ds.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name <> 'schema_migrations' ORDER BY table_name");
    expect(filas.map((f: { table_name: string }) => f.table_name)).toEqual(TABLAS);
  });

  it('queda registrada la migración inicial en schema_migrations', async () => {
    const filas = await ds.query('SELECT name FROM schema_migrations');
    expect(filas.map((f: { name: string }) => f.name)).toContain('ModeloInicial1730000000000');
  });

  it('ejecutar las migraciones otra vez no falla ni duplica (idempotencia)', async () => {
    expect(await ds.runMigrations({ transaction: 'each' })).toHaveLength(0);
  });

  it('la clave pública de organización es única', async () => {
    const k = clave();
    await ds.query("INSERT INTO organizaciones (nombre, clave_publica) VALUES ('A',$1)", [k]);
    await expect(ds.query("INSERT INTO organizaciones (nombre, clave_publica) VALUES ('B',$1)", [k])).rejects.toMatchObject({ code: '23505' });
  });

  it('el estado de una organización solo admite valores controlados (restricción CHECK)', async () => {
    await expect(ds.query("INSERT INTO organizaciones (nombre, clave_publica, estado) VALUES ('C',$1,'INVENTADO')", [clave()])).rejects.toMatchObject({ code: '23514' });
  });

  it('el rol de un usuario solo admite SUPER_ADMIN, ADMIN_ORG u OPERADOR', async () => {
    const id = await org();
    await expect(ds.query("INSERT INTO usuarios (organizacion_id, correo, hash_clave, nombre, rol) VALUES ($1,'x@x.local','h','X','HACKER')", [id])).rejects.toMatchObject({ code: '23514' });
  });

  it('el correo de un usuario es único dentro de su organización, no entre organizaciones', async () => {
    const [a, b] = [await org(), await org()];
    const ins = (o: string) => ds.query("INSERT INTO usuarios (organizacion_id, correo, hash_clave, nombre, rol) VALUES ($1,'mismo@x.local','h','X','OPERADOR')", [o]);
    await ins(a);
    await expect(ins(a)).rejects.toMatchObject({ code: '23505' });
    await expect(ins(b)).resolves.toBeDefined();
  });

  it('no se puede crear un caso con un donante que no existe (llave foránea)', async () => {
    const o = await org();
    const [{ id: usr }] = await ds.query("INSERT INTO usuarios (organizacion_id, correo, hash_clave, nombre, rol) VALUES ($1,'g@x.local','h','G','OPERADOR') RETURNING id", [o]);
    await expect(ds.query('INSERT INTO casos (organizacion_id, donante_id, creado_por) VALUES ($1, $2, $3)', [o, '00000000-0000-4000-8000-000000000000', usr])).rejects.toMatchObject({ code: '23503' });
  });

  it('el donante es único por organización, tipo y número de documento', async () => {
    const o = await org();
    const ins = () => ds.query("INSERT INTO donantes (organizacion_id, tipo_documento, numero_documento, nombres, apellidos) VALUES ($1,'CC','12345678','A','B')", [o]);
    await ins();
    await expect(ins()).rejects.toMatchObject({ code: '23505' });
  });

  it('los identificadores y las fechas de creación se generan en la base de datos', async () => {
    const [fila] = await ds.query('INSERT INTO organizaciones (nombre, clave_publica) VALUES ($1,$2) RETURNING id, creado_en', ['I', clave()]);
    expect(fila.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(fila.creado_en).toBeInstanceOf(Date);
  });
});
