/**
 * Esquema de un formato: secciones con campos tipados. Vive en plantillas_formato.esquema (JSONB), de modo que
 * agregar o actualizar un formato es cargar datos, no cambiar código.
 */
export type TipoCampo = 'texto' | 'areaTexto' | 'fecha' | 'seleccion' | 'booleano' | 'numero' | 'tabla';
export type TipoColumna = 'texto' | 'fecha' | 'numero' | 'seleccion';

/** Columna de una tabla. Con `formula` es calculada (solo lectura): suma de `mas` menos suma de `menos`. */
export interface ColumnaTabla {
  clave: string;
  etiqueta: string;
  tipo: TipoColumna;
  opciones?: string[];
  formula?: { mas: string[]; menos?: string[] };
}

/** Conteo de filas por cada opción de una columna de selección (p. ej. donantes por lugar de ubicación). */
export interface ResumenTabla {
  columna: string;
  titulo: string;
}

export interface CampoFormato {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  requerido: boolean;
  opciones?: string[];
  /** De dónde se precarga: donante.<campo>, caso.<campo> o ia.<campo> (sugerencia aceptada/modificada). */
  origen?: string;
  // ---- Solo para tipo «tabla» (informes periódicos) ----
  columnas?: ColumnaTabla[];
  /** Filas con rótulo fijo y en ese orden (p. ej. los 12 meses). Sin esto la tabla admite filas libres hasta `maxFilas`. */
  filasFijas?: string[];
  maxFilas?: number;
  /** Agrega una fila de totales (suma de cada columna numérica, incluidas las calculadas). */
  totales?: boolean;
  resumenes?: ResumenTabla[];
}

export interface SeccionFormato {
  titulo: string;
  campos: CampoFormato[];
}

export interface EsquemaFormato {
  /** CASO (por defecto): se diligencia por caso. INFORME: se diligencia por periodo y organización (informes de bancos de tejido). */
  ambito?: 'CASO' | 'INFORME';
  /** Solo INFORME: forma del periodo, «AAAA-MM» (mensual) o «AAAA-Sww» (semanal). */
  periodicidad?: 'MENSUAL' | 'SEMANAL';
  secciones: SeccionFormato[];
}

export type ValorCelda = string | number;
export type FilaTabla = Record<string, ValorCelda>;
export type ValorCampo = string | number | boolean | FilaTabla[];
export type DatosFormato = Record<string, ValorCampo>;

export const MAX_FILAS_TABLA = 200;

export const todosLosCampos = (e: EsquemaFormato): CampoFormato[] => e.secciones.flatMap((s) => s.campos);

const esFechaValida = (v: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/**
 * Valida los datos contra el esquema. Devuelve un mapa clave → mensaje (vacío si todo está bien).
 * Con `completo` exige los campos requeridos; sin él admite un borrador parcial, pero lo que venga debe ser válido.
 */
const celdaVacia = (v: unknown): boolean => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/** Valida una tabla: forma, filas, columnas conocidas, columnas calculadas prohibidas y tipo de cada celda. */
function validarTabla(c: CampoFormato, v: unknown, errores: Record<string, string>): void {
  if (!Array.isArray(v)) { errores[c.clave] = 'Debe ser una lista de filas'; return; }
  const limite = c.filasFijas ? c.filasFijas.length : c.maxFilas ?? MAX_FILAS_TABLA;
  if (v.length > limite) { errores[c.clave] = `Máximo ${limite} filas`; return; }
  const columnas = new Map((c.columnas ?? []).map((col) => [col.clave, col]));
  v.forEach((fila, i) => {
    if (fila === null || typeof fila !== 'object' || Array.isArray(fila)) { errores[`${c.clave}[${i}]`] = 'La fila debe ser un objeto'; return; }
    for (const [k, x] of Object.entries(fila as Record<string, unknown>)) {
      const col = columnas.get(k);
      const clave = `${c.clave}[${i}].${k}`;
      if (!col) { errores[clave] = 'Columna no definida en la tabla'; continue; }
      if (col.formula) { errores[clave] = 'Columna calculada: no se diligencia'; continue; }
      if (celdaVacia(x)) continue;
      if (col.tipo === 'texto' && (typeof x !== 'string' || x.length > 300)) errores[clave] = 'Debe ser un texto de máximo 300 caracteres';
      else if (col.tipo === 'fecha' && (typeof x !== 'string' || !esFechaValida(x))) errores[clave] = 'Debe ser una fecha válida AAAA-MM-DD';
      else if (col.tipo === 'numero' && (typeof x !== 'number' || !Number.isFinite(x) || x < 0)) errores[clave] = 'Debe ser un número mayor o igual a 0';
      else if (col.tipo === 'seleccion' && (typeof x !== 'string' || !(col.opciones ?? []).includes(x))) errores[clave] = `Debe ser una de: ${(col.opciones ?? []).join(', ')}`;
    }
  });
}

export function validarDatos(esquema: EsquemaFormato, datos: Record<string, unknown>, completo: boolean): Record<string, string> {
  const errores: Record<string, string> = {};
  const campos = new Map(todosLosCampos(esquema).map((c) => [c.clave, c]));
  for (const clave of Object.keys(datos)) {
    if (!campos.has(clave)) errores[clave] = 'Campo no definido en el formato';
  }
  for (const c of campos.values()) {
    const v = datos[c.clave];
    if (c.tipo === 'tabla') {
      // La forma y el límite de filas se validan siempre; un valor que no es lista es un error, no «vacío».
      if (v !== undefined && v !== null) validarTabla(c, v, errores);
      const conDatos = Array.isArray(v) && v.some((f) => f && typeof f === 'object' && Object.keys(f).length > 0);
      if (completo && c.requerido && !conDatos && !errores[c.clave]) errores[c.clave] = 'Este campo es obligatorio';
      continue;
    }
    const vacio = celdaVacia(v);
    if (vacio) {
      if (completo && c.requerido) errores[c.clave] = 'Este campo es obligatorio';
      continue;
    }
    if (errores[c.clave]) continue;
    switch (c.tipo) {
      case 'texto':
        if (typeof v !== 'string' || v.length > 300) errores[c.clave] = 'Debe ser un texto de máximo 300 caracteres';
        break;
      case 'areaTexto':
        if (typeof v !== 'string' || v.length > 3000) errores[c.clave] = 'Debe ser un texto de máximo 3000 caracteres';
        break;
      case 'fecha':
        if (typeof v !== 'string' || !esFechaValida(v)) errores[c.clave] = 'Debe ser una fecha válida AAAA-MM-DD';
        break;
      case 'seleccion':
        if (typeof v !== 'string' || !(c.opciones ?? []).includes(v)) errores[c.clave] = `Debe ser una de: ${(c.opciones ?? []).join(', ')}`;
        break;
      case 'booleano':
        if (typeof v !== 'boolean') errores[c.clave] = 'Debe ser verdadero o falso';
        break;
      case 'numero':
        if (typeof v !== 'number' || !Number.isFinite(v)) errores[c.clave] = 'Debe ser un número';
        break;
    }
  }
  return errores;
}

/** Deja los textos recortados y descarta vacíos, para guardar siempre la misma forma. */
export function normalizarDatos(datos: Record<string, unknown>): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(datos)) {
    if (Array.isArray(v)) {
      // Tabla: se limpian las celdas vacías. Las filas conservan su posición (en tablas de filas fijas la posición es el rótulo).
      const filas = v.map((f) =>
        f && typeof f === 'object' && !Array.isArray(f)
          ? Object.fromEntries(Object.entries(f as Record<string, unknown>).map(([c, x]) => [c, typeof x === 'string' ? x.trim() : x]).filter(([, x]) => x !== '' && x !== null && x !== undefined))
          : f,
      );
      salida[k] = filas;
      continue;
    }
    const x = typeof v === 'string' ? v.trim() : v;
    if (x !== '' && x !== null && x !== undefined) salida[k] = x;
  }
  return salida;
}

const compacto = (s: string): string => s.toUpperCase().replace(/\s+/g, '').replace('POSITIVO', '+').replace('NEGATIVO', '-');

/** Busca la opción equivalente («O positivo» → «O+»); devuelve undefined si no hay ninguna. */
export function normalizarOpcion(valor: string, opciones: string[]): string | undefined {
  const v = compacto(valor);
  return opciones.find((o) => compacto(o) === v);
}

/** Valores que se pueden usar para precargar, por «origen». Solo se usan los que existen. */
export type FuentesPrecarga = Record<string, string | null | undefined>;

/**
 * Propone un valor inicial por campo a partir de las fuentes. Nunca inventa: si el origen no tiene dato, o el dato
 * no es válido para el tipo del campo (fecha mal formada, opción inexistente), el campo queda sin precargar.
 */
export function precargar(esquema: EsquemaFormato, fuentes: FuentesPrecarga): DatosFormato {
  const salida: DatosFormato = {};
  for (const c of todosLosCampos(esquema)) {
    const bruto = c.origen ? fuentes[c.origen] : undefined;
    if (bruto === undefined || bruto === null || bruto.trim() === '') continue;
    if (c.tipo === 'seleccion') {
      const o = normalizarOpcion(bruto, c.opciones ?? []);
      if (o) salida[c.clave] = o;
    } else if (c.tipo === 'fecha') {
      if (esFechaValida(bruto.trim())) salida[c.clave] = bruto.trim();
    } else if (c.tipo === 'texto' || c.tipo === 'areaTexto') {
      salida[c.clave] = bruto.trim();
    }
  }
  return salida;
}
