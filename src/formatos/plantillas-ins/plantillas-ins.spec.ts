import { CampoFormato, precargar, todosLosCampos, validarDatos } from '../esquema';
import { calcularTabla } from '../tablas';
import { PLANTILLAS_INS } from './index';

const ORIGENES_VALIDOS = new Set([
  'donante.nombres', 'donante.apellidos', 'donante.nombreCompleto', 'donante.tipoDocumento', 'donante.numeroDocumento', 'donante.sexo',
  'donante.fechaNacimiento', 'caso.tipoDonante', 'caso.causaMuerte',
]);

/** Una fila válida de una tabla: un valor por columna diligenciable. */
const filaValida = (t: CampoFormato): Record<string, string | number> =>
  Object.fromEntries(
    (t.columnas ?? []).filter((c) => !c.formula).map((c) => [c.clave, c.tipo === 'fecha' ? '2026-11-08' : c.tipo === 'numero' ? 1 : c.tipo === 'seleccion' ? (c.opciones as string[])[0] : 'x']),
  );

describe('plantillas oficiales del INS', () => {
  it('incluye los quince formatos y informes con código único', () => {
    const codigos = PLANTILLAS_INS.map((p) => p.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
    expect(codigos).toEqual(expect.arrayContaining(['INS-GESTION-DONANTE', 'INS-ENTREVISTA-FAMILIAR', 'INS-OFERTA-NACIONAL', 'INS-BIOVIG-ORGANOS', 'INS-RESCATE-DONANTE', 'INS-FICHAS-ORGANOS', 'INS-FICHAS-TEJIDOS', 'INS-BIOVIG-TEJIDOS', 'INS-INFORME-BANCO-OCULAR', 'INS-INFORME-BANCO-PIEL', 'INS-INFORME-BANCO-CARDIOVASCULAR', 'INS-INFORME-BANCO-OSEO-CADAVERICO', 'INS-INFORME-BANCO-OSEO-VIVO', 'INS-INFORME-BANCO-MEMBRANA', 'INS-LISTA-ESPERA-TEJIDO']));
  });

  describe.each(PLANTILLAS_INS)('$codigo', (p) => {
    const campos = todosLosCampos(p.esquema);

    it('tiene claves únicas, etiquetas y tipos válidos', () => {
      const claves = campos.map((c) => c.clave);
      // los informes concentran su contenido en tablas: pocos campos de primer nivel, muchas columnas
      expect(claves.length).toBeGreaterThanOrEqual(p.esquema.ambito === 'INFORME' ? 3 : 31);
      expect(new Set(claves).size).toBe(claves.length);
      for (const c of campos) {
        expect(c.clave).toMatch(/^[A-Za-z][A-Za-z0-9_]*$/);
        expect(c.etiqueta.trim().length).toBeGreaterThanOrEqual(2); // hay etiquetas cortas legítimas: FC, FR, Rh, BE, PT
      }
    });

    it('toda selección tiene opciones distintas y los orígenes son conocidos', () => {
      for (const c of campos) {
        if (c.tipo === 'tabla') {
          expect(c.columnas?.length).toBeGreaterThanOrEqual(2);
          continue;
        }
        if (c.tipo === 'seleccion') {
          expect(c.opciones?.length).toBeGreaterThanOrEqual(2);
          expect(new Set(c.opciones).size).toBe(c.opciones?.length);
        } else {
          expect(c.opciones).toBeUndefined();
        }
        if (c.origen) expect(ORIGENES_VALIDOS.has(c.origen) || c.origen.startsWith('ia.')).toBe(true);
      }
    });

    it('un borrador vacío es válido y uno completo exige solo los requeridos', () => {
      expect(validarDatos(p.esquema, {}, false)).toEqual({});
      const errores = validarDatos(p.esquema, {}, true);
      expect(Object.keys(errores).sort()).toEqual(campos.filter((c) => c.requerido).map((c) => c.clave).sort());
    });

    it('con un valor válido por campo no hay errores', () => {
      const datos: Record<string, string | number | boolean | Record<string, string | number>[]> = {};
      for (const c of campos) {
        datos[c.clave] = c.tipo === 'tabla' ? [filaValida(c)] : c.tipo === 'fecha' ? '2026-11-08' : c.tipo === 'numero' ? 1 : c.tipo === 'booleano' ? true : c.tipo === 'seleccion' ? (c.opciones as string[])[0] : 'x';
      }
      expect(validarDatos(p.esquema, datos, true)).toEqual({});
    });

    it('las tablas tienen columnas únicas, fórmulas que apuntan a columnas existentes y opciones en las selecciones', () => {
      for (const t of campos.filter((c) => c.tipo === 'tabla')) {
        const claves = (t.columnas ?? []).map((c) => c.clave);
        expect(new Set(claves).size).toBe(claves.length);
        expect(t.filasFijas || t.maxFilas).toBeTruthy();
        for (const c of t.columnas ?? []) {
          if (c.tipo === 'seleccion') expect(c.opciones?.length).toBeGreaterThanOrEqual(1);
          for (const k of [...(c.formula?.mas ?? []), ...(c.formula?.menos ?? [])]) expect(claves.indexOf(k)).toBeGreaterThanOrEqual(0);
          // una columna calculada solo puede usar columnas definidas ANTES (se calculan en orden)
          for (const k of [...(c.formula?.mas ?? []), ...(c.formula?.menos ?? [])]) expect(claves.indexOf(k)).toBeLessThan(claves.indexOf(c.clave));
        }
        for (const r of t.resumenes ?? []) expect(claves).toContain(r.columna);
        // el cálculo no falla con una fila vacía ni con una completa
        expect(() => calcularTabla(t, [{}, filaValida(t)])).not.toThrow();
      }
    });
  });

  it('el formato de gestión precarga lo que el sistema ya sabe (donante, tipo e IA aceptada)', () => {
    const g = PLANTILLAS_INS.find((p) => p.codigo === 'INS-GESTION-DONANTE')!;
    const datos = precargar(g.esquema, {
      'donante.sexo': 'M', 'donante.fechaNacimiento': '1980-02-03', 'caso.tipoDonante': 'TOTIPOTENCIAL',
      'ia.grupoSanguineo': 'O positivo', 'ia.fechaIngreso': '2026-11-01', 'ia.diagnosticoPrincipal': 'Traumatismo craneoencefálico severo',
    });
    expect(datos).toMatchObject({
      sexo: 'M', fechaNacimiento: '1980-02-03', tipoDonante: 'Totipotencial', grupoSanguineo: 'O+', fechaIngreso: '2026-11-01',
      diagnosticoPrincipal: 'Traumatismo craneoencefálico severo',
    });
  });

  it('el formato de entrevista no pre-carga nada si no hay donante (no inventa datos)', () => {
    const e = PLANTILLAS_INS.find((p) => p.codigo === 'INS-ENTREVISTA-FAMILIAR')!;
    expect(precargar(e.esquema, {})).toEqual({});
  });
});
