// Pruebas de RENDIMIENTO de la API con autocannon. Los objetivos se fijan AQUÍ, antes de medir, y el informe dice si se cumplen o no.
// Variables: API_URL (por defecto http://127.0.0.1:3100), ADMIN_PASSWORD (obligatoria), TENANT_KEY, ADMIN_EMAIL, DURACION (s por escenario, 10), SALIDA (ruta del JSON)
// Nota: cada solicitud lleva un X-Forwarded-For distinto para medir la aplicación y no el limitador de solicitudes por IP.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.API_URL ?? 'http://127.0.0.1:3100').replace(/\/$/, '');
const API = `${BASE}/api/v1`;
const TENANT = process.env.TENANT_KEY ?? 'pk_demo_clinica';
const EMAIL = process.env.ADMIN_EMAIL ?? 'coordinador@demo.local';
const CLAVE = process.env.ADMIN_PASSWORD;
const DURACION = Number(process.env.DURACION ?? 10);
const SALIDA = process.env.SALIDA ?? resolve(AQUI, '../resultados/resultados.json');
if (!CLAVE) throw new Error('Defina ADMIN_PASSWORD.');

const ip = () => `10.${(Math.random() * 250 + 1) | 0}.${(Math.random() * 250 + 1) | 0}.${(Math.random() * 250 + 1) | 0}`;
const json = { 'content-type': 'application/json' };

async function api(metodo, ruta, { token, body, headers = {} } = {}) {
  const h = { 'x-forwarded-for': ip(), ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) };
  let cuerpo = body;
  if (body && !(body instanceof FormData)) { h['content-type'] = 'application/json'; cuerpo = JSON.stringify(body); }
  const r = await fetch(API + ruta, { method: metodo, headers: h, body: cuerpo });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

const login = await api('POST', '/auth/login', { headers: { 'x-tenant-key': TENANT }, body: { correo: EMAIL, clave: CLAVE } });
const token = login.json.data?.accessToken;
if (!token) throw new Error(`No se pudo iniciar sesión (HTTP ${login.status}).`);
const auth = { authorization: `Bearer ${token}` };

// Preparación para el escenario de extracción: un caso con una historia clínica registrada
const caso = await api('POST', '/casos', { token, body: { donante: { tipoDocumento: 'CC', numeroDocumento: `${Date.now()}`.slice(-9), nombres: 'Carga', apellidos: 'Sintética' }, tipoDonante: 'TOTIPOTENCIAL', muerteViolenta: false } });
const txt = await readFile(resolve(AQUI, '../../docs/ejemplos/historia_clinica_sintetica.txt'));
const fd = new FormData(); fd.append('archivo', new Blob([txt], { type: 'text/plain' }), 'historia.txt');
const doc = await api('POST', `/casos/${caso.json.data.id}/documentos`, { token, body: fd });
const casoId = caso.json.data.id, docId = doc.json.data.id;

// Objetivos (definidos antes de medir): p95 máximo en ms y 0 % de respuestas no exitosas
const ESCENARIOS = [
  { id: 'RN-01', nombre: 'GET /health (liveness)', conexiones: 10, p95: 50, solicitud: () => ({ method: 'GET', path: '/health' }), base: BASE },
  { id: 'RN-02', nombre: 'POST /auth/login (bcrypt)', conexiones: 5, p95: 500, solicitud: () => ({ method: 'POST', path: '/api/v1/auth/login', headers: { ...json, 'x-tenant-key': TENANT }, body: JSON.stringify({ correo: EMAIL, clave: CLAVE }) }) },
  { id: 'RN-03', nombre: 'POST /casos (crear caso y donante)', conexiones: 10, p95: 500, solicitud: () => ({ method: 'POST', path: '/api/v1/casos', headers: { ...json, ...auth }, body: JSON.stringify({ donante: { tipoDocumento: 'CC', numeroDocumento: `${Date.now()}${(Math.random() * 1e6) | 0}`.slice(-12), nombres: 'Carga', apellidos: 'Sintética' }, tipoDonante: 'TOTIPOTENCIAL', muerteViolenta: false }) }) },
  { id: 'RN-04', nombre: 'GET /casos?pageSize=20 (listado paginado)', conexiones: 20, p95: 300, solicitud: () => ({ method: 'GET', path: '/api/v1/casos?page=1&pageSize=20', headers: auth }) },
  { id: 'RN-05', nombre: 'GET /casos/{id} (detalle)', conexiones: 20, p95: 200, solicitud: () => ({ method: 'GET', path: `/api/v1/casos/${casoId}`, headers: auth }) },
  { id: 'RN-06', nombre: 'POST /casos/{id}/extracciones-ia (simulador)', conexiones: 10, p95: 1000, solicitud: () => ({ method: 'POST', path: `/api/v1/casos/${casoId}/extracciones-ia`, headers: { ...json, ...auth }, body: JSON.stringify({ documentoOrigenId: docId }) }) },
  { id: 'RN-07', nombre: 'Rampa: GET /casos con 10 conexiones', conexiones: 10, p95: 300, solicitud: () => ({ method: 'GET', path: '/api/v1/casos?page=1&pageSize=20', headers: auth }) },
  { id: 'RN-08', nombre: 'Rampa: GET /casos con 50 conexiones', conexiones: 50, p95: 800, solicitud: () => ({ method: 'GET', path: '/api/v1/casos?page=1&pageSize=20', headers: auth }) },
  { id: 'RN-09', nombre: 'Rampa: GET /casos con 100 conexiones', conexiones: 100, p95: 1500, solicitud: () => ({ method: 'GET', path: '/api/v1/casos?page=1&pageSize=20', headers: auth }) },
];

const resultados = [];
for (const e of ESCENARIOS) {
  const r = await autocannon({
    url: e.base ?? BASE, connections: e.conexiones, duration: DURACION,
    requests: [{ setupRequest: (req) => { const s = e.solicitud(); return { ...req, ...s, headers: { ...(s.headers ?? {}), 'x-forwarded-for': ip() } }; } }],
  });
  const total = r.requests.total;
  const exitosas = r['2xx'];
  const fila = {
    id: e.id, escenario: e.nombre, conexiones: e.conexiones, duracionS: DURACION,
    solicitudes: total, reqPorSeg: Math.round(r.requests.average), p50: r.latency.p50, p95: r.latency.p97_5 && r.latency.p90 ? null : null,
    p90: r.latency.p90, p975: r.latency.p97_5, p99: r.latency.p99, max: r.latency.max,
    exitosas2xx: exitosas, noExitosas: r.non2xx + r.errors + r.timeouts, objetivoP95: e.p95,
  };
  resultados.push({ ...fila, _lat: r.latency });
  console.log(`${e.id} ${e.nombre}: ${total} solicitudes, ${fila.reqPorSeg} req/s, p50 ${fila.p50} ms, p90 ${fila.p90} ms, p97.5 ${fila.p975} ms, p99 ${fila.p99} ms, no exitosas ${fila.noExitosas}`);
}

// autocannon (histograma) expone p50, p90, p97_5, p99: se usa el p97,5 como cota conservadora del p95 (siempre ≥ p95)
const salida = resultados.map(({ _lat, p95, ...x }) => ({ ...x, p95Cota: x.p975, cumple: x.p975 <= x.objetivoP95 && x.noExitosas === 0 }));
await mkdir(dirname(SALIDA), { recursive: true });
await writeFile(SALIDA, JSON.stringify({ fecha: new Date().toISOString(), api: BASE, nodo: process.version, plataforma: process.platform, escenarios: salida }, null, 2));
for (const s of salida) console.log(`${s.cumple ? 'CUMPLE ' : 'NO CUMPLE'} ${s.id} p97,5=${s.p975} ms (objetivo p95 ≤ ${s.objetivoP95} ms), no exitosas=${s.noExitosas}`);
// El proceso termina con error si algún objetivo no se cumple (lo usa el CI)
if (salida.some((s) => !s.cumple)) process.exitCode = 1;
