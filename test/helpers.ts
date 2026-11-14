import { randomInt, randomUUID } from 'crypto';
import { BadRequestException, INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import compression from 'compression';
import helmet from 'helmet';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { QueryFailedFilter } from '../src/common/filters/query-failed.filter';
import { ExtractorIa } from '../src/ia/ports/extractor-ia.port';

function aplanar(errors: ValidationError[], prefijo = ''): { property: string; constraints: Record<string, string> }[] {
  return errors.flatMap((e) => {
    const prop = prefijo ? `${prefijo}.${e.property}` : e.property;
    return [...(e.constraints ? [{ property: prop, constraints: e.constraints }] : []), ...aplanar(e.children ?? [], prop)];
  });
}

/** Levanta la aplicación REAL (todos los módulos, PostgreSQL real) con la misma configuración global que main.ts. */
export async function crearApp(extractor?: Partial<ExtractorIa>): Promise<NestExpressApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (extractor) builder = builder.overrideProvider(ExtractorIa).useValue(extractor);
  const mod = await builder.compile();
  const app = mod.createNestApplication<NestExpressApplication>();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, forbidNonWhitelisted: true, transform: true,
      exceptionFactory: (errors) => new BadRequestException({ message: 'Datos inválidos', error: aplanar(errors) }),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(), new QueryFailedFilter());
  app.enableCors({ origin: [process.env.FRONTEND_URL as string], credentials: false });
  await app.init();
  return app;
}

/** Dirección IP distinta por solicitud: así el límite de 60 solicitudes por minuto por IP no interfiere en pruebas que no lo miden. */
export const ipAleatoria = () => `10.${randomInt(1, 250)}.${randomInt(1, 250)}.${randomInt(1, 250)}`;

export interface Sesion { org: { id: string; clave: string }; correo: string; clavePlana: string; token: string; userId: string }

/** Crea una organización con un usuario y devuelve su sesión ya iniciada por la API (login real). */
export async function crearSesion(app: INestApplication, opciones: { rol?: string; estadoOrg?: string } = {}): Promise<Sesion> {
  const ds = app.get(DataSource);
  const sufijo = randomUUID().slice(0, 8);
  const clave = `pk_${sufijo}`;
  const correo = `u_${sufijo}@prueba.local`;
  const clavePlana = `Clave-${sufijo}-1`;
  const [org] = await ds.query('INSERT INTO organizaciones (nombre, clave_publica, estado) VALUES ($1,$2,$3) RETURNING id', [`Org ${sufijo}`, clave, opciones.estadoOrg ?? 'ACTIVA']);
  const [usr] = await ds.query(
    'INSERT INTO usuarios (organizacion_id, correo, hash_clave, nombre, rol) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [org.id, correo, await bcrypt.hash(clavePlana, 4), `Usuario ${sufijo}`, opciones.rol ?? 'OPERADOR'],
  );
  let token = '';
  if ((opciones.estadoOrg ?? 'ACTIVA') === 'ACTIVA') {
    const r = await request(app.getHttpServer()).post('/api/v1/auth/login').set('X-Forwarded-For', ipAleatoria()).set('X-Tenant-Key', clave).send({ correo, clave: clavePlana });
    token = r.body.data?.accessToken ?? '';
  }
  return { org: { id: org.id, clave }, correo, clavePlana, token, userId: usr.id };
}

/** Cliente HTTP autenticado: cada llamada usa una IP distinta (ver ipAleatoria). */
export function api(app: INestApplication, token?: string) {
  const base = () => (req: request.Test) => {
    req.set('X-Forwarded-For', ipAleatoria());
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };
  const s = () => request(app.getHttpServer());
  return {
    get: (ruta: string) => base()(s().get(`/api/v1${ruta}`)),
    post: (ruta: string) => base()(s().post(`/api/v1${ruta}`)),
    patch: (ruta: string) => base()(s().patch(`/api/v1${ruta}`)),
    raw: () => s(),
  };
}

export const donanteAleatorio = (extra: Record<string, unknown> = {}) => ({
  tipoDocumento: 'CC', numeroDocumento: String(randomInt(10_000_000, 99_999_999)), nombres: 'Juan', apellidos: 'Pérez (sintético)', ...extra,
});

export async function crearCaso(app: INestApplication, token: string, extra: Record<string, unknown> = {}) {
  const r = await api(app, token).post('/casos').send({ donante: donanteAleatorio(), ...extra });
  return r.body.data as { id: string; donante: { id: string } };
}

export const HISTORIA = [
  'HISTORIA CLÍNICA (DATOS SINTÉTICOS DE PRUEBA)',
  'Fecha de ingreso: 2026-10-27',
  'Diagnóstico principal: Traumatismo craneoencefálico severo con herniación cerebral',
  'Causa de muerte: Muerte encefálica secundaria a traumatismo craneoencefálico',
  'Antecedentes: Sin enfermedades crónicas. No fumador.',
  'Grupo sanguíneo: O positivo',
].join('\n');

export async function subirTexto(app: INestApplication, token: string, casoId: string, texto = HISTORIA) {
  const r = await api(app, token).post(`/casos/${casoId}/documentos/texto`).send({ texto });
  return r.body.data as { id: string };
}

/** Firma un JWT RS256 válido con las llaves de la aplicación (para probar audiencias distintas a la del personal). */
export function firmar(app: INestApplication, payload: Record<string, unknown>, opciones: { expiresIn?: string } = {}) {
  return app.get(JwtService, { strict: false }).signAsync(payload, opciones as never);
}
