import { generarClaveAleatoria } from './clave-aleatoria';

describe('generarClaveAleatoria', () => {
  it('tiene el largo pedido y los cuatro tipos de carácter', () => {
    for (let i = 0; i < 200; i++) {
      const c = generarClaveAleatoria(14);
      expect(c).toHaveLength(14);
      expect(c).toMatch(/[A-Z]/);
      expect(c).toMatch(/[a-z]/);
      expect(c).toMatch(/[0-9]/);
      expect(c).toMatch(/[#$%&*+=?@-]/);
    }
  });

  it('no usa caracteres ambiguos (0, O, 1, l, I)', () => {
    for (let i = 0; i < 200; i++) expect(generarClaveAleatoria()).not.toMatch(/[0O1lI]/);
  });

  it('no repite claves', () => {
    const claves = new Set(Array.from({ length: 500 }, () => generarClaveAleatoria()));
    expect(claves.size).toBe(500);
  });
});
