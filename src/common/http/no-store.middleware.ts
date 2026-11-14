import { NextFunction, Request, Response } from 'express';

/**
 * Las respuestas de la API contienen datos personales y de salud: ni el navegador compartido, ni un proxy, ni un CDN
 * deben guardarlas. Se aplica a todo /api (no a las sondas de salud).
 */
export function sinCache(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
}
