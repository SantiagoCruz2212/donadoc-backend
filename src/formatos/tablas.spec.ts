import { CampoFormato, EsquemaFormato, normalizarDatos, validarDatos } from './esquema';
import { calcularTabla, calcularTablas } from './tablas';

const campo: CampoFormato = {
  clave: 'det', etiqueta: 'Detección', tipo: 'tabla', requerido: false, filasFijas: ['Enero', 'Febrero', 'Marzo'], totales: true,
  columnas: [
    { clave: 'a', etiqueta: 'A', tipo: 'numero' },
    { clave: 'b', etiqueta: 'B', tipo: 'numero' },
    { clave: 'c', etiqueta: 'C', tipo: 'numero' },
    { clave: 'neto', etiqueta: 'Neto', tipo: 'numero', formula: { mas: ['a', 'b'], menos: ['c'] } },
    { clave: 'doble', etiqueta: 'Doble', tipo: 'numero', formula: { mas: ['neto', 'neto'] } },
    { clave: 'lugar', etiqueta: 'Lugar', tipo: 'seleccion', opciones: ['IPS', 'INMLCF'] },
  ],
  resumenes: [{ columna: 'lugar', titulo: 'Por lugar' }],
};
const libre: CampoFormato = {
  clave: 'obt', etiqueta: 'Obtención', tipo: 'tabla', requerido: true, maxFilas: 3,
  columnas: [
    { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' },
    { clave: 'texto', etiqueta: 'Texto', tipo: 'texto' },
    { clave: 'n', etiqueta: 'N', tipo: 'numero' },
    { clave: 'lugar', etiqueta: 'Lugar', tipo: 'seleccion', opciones: ['IPS', 'INMLCF'] },
  ],
};
const esquema: EsquemaFormato = { ambito: 'INFORME', periodicidad: 'MENSUAL', secciones: [{ titulo: 'T', campos: [campo, libre, { clave: 'banco', etiqueta: 'Banco', tipo: 'texto', requerido: true }] }] };

describe('calcularTabla', () => {
  it('calcula columnas con fórmula, también las que dependen de otras calculadas, y respeta la posición', () => {
    const r = calcularTabla(campo, [{ a: 5, b: 3, c: 2 }, {}, { a: 1 }]);
    expect(r.filas).toHaveLength(3);
    expect(r.filas[0]).toMatchObject({ neto: 6, doble: 12 });
    expect(r.filas[1]).toMatchObject({ neto: 0, doble: 0 });
    expect(r.filas[2]).toMatchObject({ neto: 1, doble: 2 });
  });

  it('un valor no numérico o vacío cuenta como cero y el resultado puede ser negativo', () => {
    const r = calcularTabla(campo, [{ a: 'x' as unknown as number, c: 4 }]);
    expect(r.filas[0].neto).toBe(-4);
  });

  it('suma totales de todas las columnas numéricas (calculadas incluidas) y no de las demás', () => {
    const r = calcularTabla(campo, [{ a: 1, b: 2 }, { a: 3, c: 1 }]);
    expect(r.totales).toEqual({ a: 4, b: 2, c: 1, neto: 3 + 2, doble: (3 + 2) * 2 });
    expect(r.totales).not.toHaveProperty('lugar');
  });

  it('con filas fijas hay siempre una fila por rótulo, aunque no se envíen datos', () => {
    expect(calcularTabla(campo, undefined).filas).toHaveLength(3);
    expect(calcularTabla(campo, []).totales).toMatchObject({ a: 0, neto: 0 });
  });

  it('cuenta filas por cada opción de la columna de selección, con todas las opciones en 0', () => {
    const r = calcularTabla(campo, [{ lugar: 'IPS' }, { lugar: 'IPS' }, { lugar: 'INMLCF' }]);
    expect(r.resumenes).toEqual([{ titulo: 'Por lugar', columna: 'lugar', conteos: { IPS: 2, INMLCF: 1 } }]);
    expect(calcularTabla(campo, []).resumenes[0].conteos).toEqual({ IPS: 0, INMLCF: 0 });
  });

  it('en una tabla libre solo hay las filas enviadas y no hay totales si no se piden', () => {
    const r = calcularTabla(libre, [{ n: 2 }, { n: 5 }]);
    expect(r.filas).toHaveLength(2);
    expect(r.totales).toBeUndefined();
  });

  it('calcularTablas recorre el esquema y deja fuera lo que no es tabla', () => {
    const r = calcularTablas(esquema, { det: [{ a: 1 }] });
    expect(Object.keys(r).sort()).toEqual(['det', 'obt']);
    expect(r.obt.filas).toEqual([]);
  });
});

describe('validación y normalización de tablas', () => {
  const ok = { banco: 'B', obt: [{ fecha: '2026-10-05', texto: 'x', n: 2, lugar: 'IPS' }] };

  it('acepta una tabla válida y filas de una tabla de filas fijas', () => {
    expect(validarDatos(esquema, { ...ok, det: [{ a: 1, lugar: 'IPS' }, {}, { b: 2 }] }, true)).toEqual({});
  });

  it('exige una tabla obligatoria con al menos una fila con datos', () => {
    expect(validarDatos(esquema, { banco: 'B' }, true)).toEqual({ obt: 'Este campo es obligatorio' });
    expect(validarDatos(esquema, { banco: 'B', obt: [{}] }, true)).toEqual({ obt: 'Este campo es obligatorio' });
    expect(validarDatos(esquema, { obt: [] }, false)).toEqual({});
  });

  it('rechaza lo que no es lista, el exceso de filas y las filas que no son objetos', () => {
    expect(validarDatos(esquema, { obt: 'x' }, false).obt).toMatch(/lista de filas/);
    expect(validarDatos(esquema, { obt: [{}, {}, {}, {}] }, false).obt).toMatch(/Máximo 3 filas/);
    expect(validarDatos(esquema, { det: [{}, {}, {}, {}] }, false).det).toMatch(/Máximo 3 filas/);
    expect(validarDatos(esquema, { obt: [5] }, false)['obt[0]']).toMatch(/objeto/);
    expect(validarDatos(esquema, { obt: [[]] }, false)['obt[0]']).toMatch(/objeto/);
  });

  it('señala la celda exacta: columna desconocida, calculada, tipo, rango y opción', () => {
    const e = validarDatos(esquema, {
      det: [{ neto: 3 }, { zzz: 1 }],
      obt: [{ fecha: '2026-13-40', texto: 'x'.repeat(301), n: -1, lugar: 'Luna' }, { n: 'dos' }],
    }, false);
    expect(e['det[0].neto']).toMatch(/calculada/);
    expect(e['det[1].zzz']).toMatch(/no definida/);
    expect(e['obt[0].fecha']).toMatch(/fecha válida/);
    expect(e['obt[0].texto']).toMatch(/300/);
    expect(e['obt[0].n']).toMatch(/mayor o igual a 0/);
    expect(e['obt[0].lugar']).toMatch(/Debe ser una de/);
    expect(e['obt[1].n']).toMatch(/mayor o igual a 0/);
  });

  it('normaliza: recorta textos, quita celdas vacías y conserva la posición de las filas', () => {
    const r = normalizarDatos({ banco: '  B  ', obt: [{ texto: ' x ', n: '', fecha: null }, {}, { n: 3 }] });
    expect(r).toEqual({ banco: 'B', obt: [{ texto: 'x' }, {}, { n: 3 }] });
  });
});
