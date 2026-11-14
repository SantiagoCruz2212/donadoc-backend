import { EsquemaFormato, normalizarDatos, normalizarOpcion, precargar, validarDatos } from './esquema';

const esquema: EsquemaFormato = {
  secciones: [
    {
      titulo: 'Datos',
      campos: [
        { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, origen: 'donante.nombres' },
        { clave: 'ingreso', etiqueta: 'Ingreso', tipo: 'fecha', requerido: true, origen: 'ia.fechaIngreso' },
        { clave: 'grupo', etiqueta: 'Grupo', tipo: 'seleccion', requerido: true, origen: 'ia.grupoSanguineo', opciones: ['O+', 'O-', 'A+', 'AB-'] },
        { clave: 'autoriza', etiqueta: 'Autoriza', tipo: 'booleano', requerido: true },
        { clave: 'edad', etiqueta: 'Edad', tipo: 'numero', requerido: false },
      ],
    },
  ],
};

describe('validarDatos', () => {
  it('un borrador admite campos faltantes; completo exige los obligatorios', () => {
    expect(validarDatos(esquema, { nombre: 'Ana' }, false)).toEqual({});
    expect(Object.keys(validarDatos(esquema, { nombre: 'Ana' }, true)).sort()).toEqual(['autoriza', 'grupo', 'ingreso']);
  });

  it('rechaza campos que el formato no define (no se guarda basura)', () => {
    expect(validarDatos(esquema, { nombre: 'Ana', inventado: 'x' }, false)).toEqual({ inventado: 'Campo no definido en el formato' });
  });

  it('valida el tipo de cada campo, incluidas fechas inexistentes y opciones fuera de la lista', () => {
    const e = validarDatos(esquema, { ingreso: '2026-02-30', grupo: 'Z+', autoriza: 'si', edad: 'veinte' }, false);
    expect(Object.keys(e).sort()).toEqual(['autoriza', 'edad', 'grupo', 'ingreso']);
    expect(validarDatos(esquema, { ingreso: '2026-02-28', grupo: 'O+', autoriza: false, edad: 30 }, true)).toEqual({ nombre: 'Este campo es obligatorio' });
  });

  it('un texto en blanco cuenta como vacío', () => {
    expect(validarDatos(esquema, { nombre: '   ' }, true).nombre).toBe('Este campo es obligatorio');
  });
});

describe('precargar', () => {
  it('toma el valor del origen y lo ajusta a la opción equivalente («O positivo» → «O+»)', () => {
    const p = precargar(esquema, { 'donante.nombres': ' Juan ', 'ia.fechaIngreso': '2026-10-27', 'ia.grupoSanguineo': 'O positivo' });
    expect(p).toEqual({ nombre: 'Juan', ingreso: '2026-10-27', grupo: 'O+' });
  });

  it('no inventa: ignora fechas mal formadas, opciones inexistentes y orígenes sin dato', () => {
    expect(precargar(esquema, { 'ia.fechaIngreso': '27/10/2026', 'ia.grupoSanguineo': 'Z negativo', 'donante.nombres': null })).toEqual({});
  });
});

describe('normalizarOpcion y normalizarDatos', () => {
  it('equivale mayúsculas, espacios y positivo/negativo', () => {
    expect(normalizarOpcion('ab negativo', ['AB+', 'AB-'])).toBe('AB-');
    expect(normalizarOpcion('C+', ['AB+', 'AB-'])).toBeUndefined();
  });

  it('recorta textos y descarta los vacíos', () => {
    expect(normalizarDatos({ a: ' x ', b: '', c: null, d: false, e: 0 })).toEqual({ a: 'x', d: false, e: 0 });
  });
});
