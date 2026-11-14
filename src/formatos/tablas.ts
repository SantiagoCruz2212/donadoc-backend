import { CampoFormato, EsquemaFormato, FilaTabla, ValorCampo } from './esquema';

/**
 * Cálculos de las tablas de los informes (columnas con fórmula, totales y resúmenes por opción). Es la fuente de verdad:
 * el servidor los calcula al consultar y al generar el PDF; el cliente puede repetirlos para mostrarlos mientras se escribe
 * (Frontend/src/features/informes/models/calculos.ts debe dar los mismos resultados). Solo se guardan los datos diligenciados.
 */
export interface ResumenCalculado {
  titulo: string;
  columna: string;
  conteos: Record<string, number>;
}

export interface TablaCalculada {
  /** Filas con las columnas calculadas ya incluidas (misma posición que las diligenciadas). */
  filas: FilaTabla[];
  /** Suma por columna numérica (solo si la tabla pide totales). */
  totales?: Record<string, number>;
  resumenes: ResumenCalculado[];
}

const numero = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function calcularTabla(campo: CampoFormato, filas: FilaTabla[] | undefined): TablaCalculada {
  const columnas = campo.columnas ?? [];
  const cantidad = campo.filasFijas ? campo.filasFijas.length : (filas ?? []).length;
  const base: FilaTabla[] = Array.from({ length: cantidad }, (_, i) => ({ ...((filas ?? [])[i] ?? {}) }));

  for (const fila of base) {
    for (const col of columnas) {
      if (!col.formula) continue;
      const mas = col.formula.mas.reduce((s, k) => s + numero(fila[k]), 0);
      const menos = (col.formula.menos ?? []).reduce((s, k) => s + numero(fila[k]), 0);
      fila[col.clave] = mas - menos;
    }
  }

  let totales: Record<string, number> | undefined;
  if (campo.totales) {
    totales = {};
    for (const col of columnas) if (col.tipo === 'numero') totales[col.clave] = base.reduce((s, f) => s + numero(f[col.clave]), 0);
  }

  const resumenes = (campo.resumenes ?? []).map((r) => {
    const col = columnas.find((c) => c.clave === r.columna);
    const conteos: Record<string, number> = Object.fromEntries((col?.opciones ?? []).map((o) => [o, 0]));
    for (const f of base) {
      const v = f[r.columna];
      if (typeof v === 'string' && v in conteos) conteos[v] += 1;
    }
    return { titulo: r.titulo, columna: r.columna, conteos };
  });
  return { filas: base, ...(totales ? { totales } : {}), resumenes };
}

/** Calcula todas las tablas del esquema: clave de campo → resultado. */
export function calcularTablas(esquema: EsquemaFormato, datos: Record<string, ValorCampo | undefined> | null): Record<string, TablaCalculada> {
  const salida: Record<string, TablaCalculada> = {};
  for (const sec of esquema.secciones) {
    for (const c of sec.campos) {
      if (c.tipo !== 'tabla') continue;
      const v = datos?.[c.clave];
      salida[c.clave] = calcularTabla(c, Array.isArray(v) ? (v as FilaTabla[]) : undefined);
    }
  }
  return salida;
}
