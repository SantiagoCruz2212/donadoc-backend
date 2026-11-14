import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from '@auth/dto/login.dto';
import { CrearCasoDto } from '@casos/dto/crear-caso.dto';
import { ListarCasosQuery } from '@casos/dto/listar-casos.query';
import { TextoDto } from '@documentos/dto/texto.dto';
import { DecidirSugerenciaDto, ExtraerDto } from '@ia/dto/ia.dto';

/** Valida un objeto plano como lo haría el ValidationPipe y devuelve las propiedades con error (aplanadas). */
async function errores<T extends object>(clase: new () => T, plano: unknown): Promise<string[]> {
  const lista = await validate(plainToInstance(clase, plano) as object, { whitelist: true, forbidNonWhitelisted: true });
  const aplanar = (e: (typeof lista)[number], prefijo = ''): string[] => [
    ...(e.constraints ? [prefijo + e.property] : []),
    ...(e.children ?? []).flatMap((h) => aplanar(h, prefijo + e.property + '.')),
  ];
  return lista.flatMap((e) => aplanar(e));
}

const donanteOk = { tipoDocumento: 'CC', numeroDocumento: '10203040', nombres: 'Juan', apellidos: 'Pérez' };

describe('CrearCasoDto', () => {
  it('un caso mínimo válido no tiene errores', async () => {
    expect(await errores(CrearCasoDto, { donante: donanteOk })).toEqual([]);
  });

  it('un caso completo válido no tiene errores', async () => {
    expect(await errores(CrearCasoDto, { donante: { ...donanteOk, sexo: 'F', fechaNacimiento: '1990-05-20' }, tipoDonante: 'ORGANOS', muerteViolenta: true })).toEqual([]);
  });

  it('un cuerpo vacío es inválido: el donante es obligatorio', async () => {
    expect(await errores(CrearCasoDto, {})).toContain('donante');
  });

  it('un donante nulo es inválido', async () => {
    expect(await errores(CrearCasoDto, { donante: null })).toContain('donante');
  });

  it('un donante que no es un objeto es inválido', async () => {
    expect(await errores(CrearCasoDto, { donante: 'Juan' })).toContain('donante');
  });

  it.each(['CC', 'TI', 'CE', 'PA', 'RC'])('acepta el tipo de documento %s', async (t) => {
    expect(await errores(CrearCasoDto, { donante: { ...donanteOk, tipoDocumento: t } })).toEqual([]);
  });

  it.each([['XX'], [''], ['cc']])('rechaza el tipo de documento «%s»', async (t) => {
    expect(await errores(CrearCasoDto, { donante: { ...donanteOk, tipoDocumento: t } })).toContain('donante.tipoDocumento');
  });

  it.each([['123', false], ['1234', true], ['12345678901234567890', true], ['123456789012345678901', false], ['AB-1234', true], ['12 34', false], ["1234';--", false]])(
    'número de documento «%s»: válido=%s', async (n, valido) => {
      const e = await errores(CrearCasoDto, { donante: { ...donanteOk, numeroDocumento: n } });
      expect(e.includes('donante.numeroDocumento')).toBe(!valido);
    });

  it('nombres y apellidos son obligatorios y de máximo 120 caracteres', async () => {
    expect(await errores(CrearCasoDto, { donante: { ...donanteOk, nombres: '' } })).toContain('donante.nombres');
    expect(await errores(CrearCasoDto, { donante: { ...donanteOk, apellidos: 'a'.repeat(121) } })).toContain('donante.apellidos');
    expect(await errores(CrearCasoDto, { donante: { ...donanteOk, apellidos: 'a'.repeat(120) } })).toEqual([]);
  });

  it.each([['M', true], ['F', true], ['O', true], ['X', false], ['masculino', false]])('sexo «%s»: válido=%s', async (v, valido) => {
    expect((await errores(CrearCasoDto, { donante: { ...donanteOk, sexo: v } })).includes('donante.sexo')).toBe(!valido);
  });

  it('la fecha de nacimiento debe ser una fecha ISO', async () => {
    expect(await errores(CrearCasoDto, { donante: { ...donanteOk, fechaNacimiento: 'ayer' } })).toContain('donante.fechaNacimiento');
    expect(await errores(CrearCasoDto, { donante: { ...donanteOk, fechaNacimiento: '2001-02-30x' } })).toContain('donante.fechaNacimiento');
  });

  it('tipoDonante solo admite TOTIPOTENCIAL, ORGANOS o TEJIDOS', async () => {
    expect(await errores(CrearCasoDto, { donante: donanteOk, tipoDonante: 'OTRO' })).toContain('tipoDonante');
    expect(await errores(CrearCasoDto, { donante: donanteOk, tipoDonante: 'TEJIDOS' })).toEqual([]);
  });

  it('muerteViolenta debe ser booleano', async () => {
    expect(await errores(CrearCasoDto, { donante: donanteOk, muerteViolenta: 'si' })).toContain('muerteViolenta');
  });

  it('un campo no declarado (organizacionId) se rechaza', async () => {
    expect(await errores(CrearCasoDto, { donante: donanteOk, organizacionId: 'otra' })).toContain('organizacionId');
  });
});

describe('ListarCasosQuery (paginación y filtro)', () => {
  it('sin parámetros usa página 1 y 20 por página', async () => {
    const q = plainToInstance(ListarCasosQuery, {});
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(20);
    expect(await errores(ListarCasosQuery, {})).toEqual([]);
  });

  it('convierte los textos de la URL en números', () => {
    expect(plainToInstance(ListarCasosQuery, { page: '3', pageSize: '10' })).toMatchObject({ page: 3, pageSize: 10 });
  });

  it.each([['page', '0'], ['page', '-2'], ['page', '1.5'], ['page', 'x'], ['pageSize', '0'], ['pageSize', '101'], ['pageSize', 'abc']])('rechaza %s=%s', async (campo, valor) => {
    expect(await errores(ListarCasosQuery, { [campo]: valor })).toContain(campo);
  });

  it('acepta pageSize=100 (máximo) y pageSize=1 (mínimo)', async () => {
    expect(await errores(ListarCasosQuery, { pageSize: '100' })).toEqual([]);
    expect(await errores(ListarCasosQuery, { pageSize: '1' })).toEqual([]);
  });

  it('el estado solo admite los valores del modelo', async () => {
    expect(await errores(ListarCasosQuery, { estado: 'CERRADO' })).toEqual([]);
    expect(await errores(ListarCasosQuery, { estado: 'INVENTADO' })).toContain('estado');
  });
});

describe('TextoDto, ExtraerDto, DecidirSugerenciaDto y LoginDto', () => {
  it('TextoDto: acepta texto de hasta 50.000 caracteres y rechaza vacío o más largo', async () => {
    expect(await errores(TextoDto, { texto: 'a'.repeat(50000) })).toEqual([]);
    expect(await errores(TextoDto, { texto: '' })).toContain('texto');
    expect(await errores(TextoDto, { texto: 'a'.repeat(50001) })).toContain('texto');
    expect(await errores(TextoDto, {})).toContain('texto');
  });

  it('TextoDto: un texto que no es una cadena se rechaza', async () => {
    expect(await errores(TextoDto, { texto: 12345 })).toContain('texto');
    expect(await errores(TextoDto, { texto: ['a'] })).toContain('texto');
  });

  it('ExtraerDto: documentoOrigenId debe ser un UUID', async () => {
    expect(await errores(ExtraerDto, { documentoOrigenId: '7d03aa5e-1f4b-4c1d-9a8e-3f2b1c0d9e8f' })).toEqual([]);
    expect(await errores(ExtraerDto, { documentoOrigenId: 'abc' })).toContain('documentoOrigenId');
    expect(await errores(ExtraerDto, {})).toContain('documentoOrigenId');
  });

  it.each([['ACEPTADA', true], ['MODIFICADA', true], ['RECHAZADA', true], ['PENDIENTE', false], ['aceptada', false], ['', false]])('decisión «%s»: válida=%s', async (d, valida) => {
    expect((await errores(DecidirSugerenciaDto, { decision: d })).includes('decision')).toBe(!valida);
  });

  it('DecidirSugerenciaDto: valorFinal es opcional pero de máximo 500 caracteres y texto', async () => {
    expect(await errores(DecidirSugerenciaDto, { decision: 'MODIFICADA', valorFinal: 'x'.repeat(500) })).toEqual([]);
    expect(await errores(DecidirSugerenciaDto, { decision: 'MODIFICADA', valorFinal: 'x'.repeat(501) })).toContain('valorFinal');
    expect(await errores(DecidirSugerenciaDto, { decision: 'MODIFICADA', valorFinal: 99 })).toContain('valorFinal');
  });

  it('LoginDto: correo con formato válido y clave no vacía', async () => {
    expect(await errores(LoginDto, { correo: 'ana@a.local', clave: 'x' })).toEqual([]);
    expect(await errores(LoginDto, { correo: 'ana', clave: 'x' })).toContain('correo');
    expect(await errores(LoginDto, { correo: 'ana@a.local', clave: '' })).toContain('clave');
    expect(await errores(LoginDto, { correo: 'ana@a.local', clave: 'x'.repeat(101) })).toContain('clave');
  });

  it('LoginDto: rechaza intentar enviar un rol (escalada de privilegios)', async () => {
    expect(await errores(LoginDto, { correo: 'ana@a.local', clave: 'x', rol: 'SUPER_ADMIN' })).toContain('rol');
  });
});
