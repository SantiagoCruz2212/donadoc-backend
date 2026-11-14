/** Formato único de respuesta: { success, message, data?, error?, meta? } */
export interface Envelope<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
  meta?: Record<string, unknown>;
}

export function createResponse<T>(message: string, data?: T, meta?: Record<string, unknown>): Envelope<T> {
  return { success: true, message, ...(data !== undefined ? { data } : {}), ...(meta ? { meta } : {}) };
}
