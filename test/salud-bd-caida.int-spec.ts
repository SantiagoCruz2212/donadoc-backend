import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { crearApp, ipAleatoria } from './helpers';

// Archivo aparte: cierra la conexión a la base de datos de esta instancia para simular una caída.
describe('Salud cuando PostgreSQL no está disponible', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearApp();
    await app.get(DataSource).destroy(); // simula la caída de la base de datos
  });
  afterAll(async () => {
    await app.close().catch(() => undefined);
  });

  it('/health/ready responde 503 (el balanceador deja de enviar tráfico)', async () => {
    const r = await request(app.getHttpServer()).get('/health/ready').set('X-Forwarded-For', ipAleatoria());
    expect(r.status).toBe(503);
    expect(r.body.success).toBe(false); // el filtro global lo entrega en el formato único de error
  });

  it('/health (liveness) sigue respondiendo 200: una caída de la base nunca reinicia el contenedor', async () => {
    const r = await request(app.getHttpServer()).get('/health').set('X-Forwarded-For', ipAleatoria());
    expect(r.status).toBe(200);
  });
});
