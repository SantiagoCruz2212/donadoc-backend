/**
 * Ejecuta una tarea que no debe bloquear ni hacer fallar la respuesta (p. ej. enviar un correo).
 *
 * - En un servidor normal la tarea sigue en segundo plano y la respuesta no la espera: así el tiempo de respuesta
 *   no revela si una cuenta existe.
 * - En Vercel (serverless) la función se CONGELA en cuanto se envía la respuesta, y una tarea sin esperar se corta
 *   antes de terminar (el correo nunca sale). Allí se espera a que termine.
 *
 * Los errores de la tarea nunca se propagan: se delegan en `alFallar`.
 */
export async function enSegundoPlano(tarea: Promise<unknown>, alFallar?: () => void): Promise<void> {
  const segura = tarea.then(
    () => undefined,
    () => alFallar?.(),
  );
  if (process.env.VERCEL) await segura;
}
