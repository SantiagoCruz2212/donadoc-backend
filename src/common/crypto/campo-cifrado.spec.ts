import { cifrarTexto, descifrarTexto, estaCifrado, fijarClaveCifrado, jsonCifrado, textoCifrado } from './campo-cifrado';

const CLAVE_A = 'a'.repeat(64);
const CLAVE_B = 'b'.repeat(64);

describe('cifrado de campos', () => {
  beforeEach(() => fijarClaveCifrado(CLAVE_A));
  afterAll(() => fijarClaveCifrado(undefined));

  it('cifra y descifra un texto (incluidas tildes y emojis)', () => {
    const original = 'Hemorragia subaracnoidea: paciente José, 34 años ✔';
    const cifrado = cifrarTexto(original);
    expect(estaCifrado(cifrado)).toBe(true);
    expect(cifrado).not.toContain('Hemorragia');
    expect(descifrarTexto(cifrado)).toBe(original);
  });

  it('el mismo texto produce un cifrado distinto cada vez (IV aleatorio)', () => {
    expect(cifrarTexto('O positivo')).not.toBe(cifrarTexto('O positivo'));
  });

  it('una llave distinta no puede leer el dato', () => {
    const cifrado = cifrarTexto('secreto');
    fijarClaveCifrado(CLAVE_B);
    expect(() => descifrarTexto(cifrado)).toThrow();
  });

  it('detecta un dato alterado (autenticación GCM)', () => {
    const cifrado = cifrarTexto('secreto');
    const bytes = Buffer.from(cifrado.slice('enc:v1:'.length), 'base64');
    bytes[bytes.length - 1] ^= 1;
    expect(() => descifrarTexto('enc:v1:' + bytes.toString('base64'))).toThrow();
  });

  it('rechaza un dato con formato inválido', () => {
    expect(() => descifrarTexto('enc:v1:AAAA')).toThrow('formato inválido');
  });

  it('exige una llave configurada para cifrar y para leer', () => {
    const cifrado = cifrarTexto('x');
    fijarClaveCifrado(undefined);
    expect(() => cifrarTexto('x')).toThrow('DATA_ENCRYPTION_KEY');
    expect(() => descifrarTexto(cifrado)).toThrow('DATA_ENCRYPTION_KEY');
  });

  it('rechaza una llave que no tiene 64 caracteres hexadecimales', () => {
    expect(() => fijarClaveCifrado('corta')).toThrow('64 caracteres hexadecimales');
    expect(() => fijarClaveCifrado('z'.repeat(64))).toThrow('64 caracteres hexadecimales');
  });

  describe('transformador de texto', () => {
    it('guarda cifrado y devuelve el texto original', () => {
      const guardado = textoCifrado.to('Traumatismo craneoencefálico') as string;
      expect(guardado).not.toContain('Traumatismo');
      expect(textoCifrado.from(guardado)).toBe('Traumatismo craneoencefálico');
    });

    it('deja pasar null e indefinido', () => {
      expect(textoCifrado.to(null)).toBeNull();
      expect(textoCifrado.to(undefined)).toBeUndefined();
      expect(textoCifrado.from(null)).toBeNull();
    });

    it('lee un valor antiguo guardado en claro', () => {
      expect(textoCifrado.from('Sin antecedentes')).toBe('Sin antecedentes');
    });
  });

  describe('transformador de JSON', () => {
    it('guarda un objeto cifrado y lo devuelve igual', () => {
      const original = { diagnostico: 'HSA', valores: [1, 2, 3], anidado: { sexo: 'F' } };
      const guardado = jsonCifrado.to(original) as { $enc: string };
      expect(Object.keys(guardado)).toEqual(['$enc']);
      expect(JSON.stringify(guardado)).not.toContain('HSA');
      expect(jsonCifrado.from(guardado)).toEqual(original);
    });

    it('lee un JSON antiguo en claro y deja pasar null', () => {
      expect(jsonCifrado.from({ diagnostico: 'HSA' })).toEqual({ diagnostico: 'HSA' });
      expect(jsonCifrado.to(null)).toBeNull();
      expect(jsonCifrado.from(null)).toBeNull();
    });
  });
});
