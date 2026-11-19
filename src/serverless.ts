import type { IncomingMessage, ServerResponse } from 'http';
import { crearApp } from './app.factory';

type Manejador = (req: IncomingMessage, res: ServerResponse) => void;

// La aplicación se crea una sola vez por instancia de la función (arranque en frío) y se reutiliza en las siguientes solicitudes.
let servidor: Promise<Manejador> | undefined;

async function iniciar(): Promise<Manejador> {
  const app = await crearApp();
  await app.init();
  return app.getHttpAdapter().getInstance() as Manejador;
}

/** Punto de entrada de Vercel: reenvía cada solicitud a la aplicación NestJS (Express). */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  servidor ??= iniciar().catch((e) => {
    servidor = undefined; // si falla el arranque (p. ej. la base no responde), la siguiente solicitud lo reintenta
    throw e;
  });
  (await servidor)(req, res);
}
