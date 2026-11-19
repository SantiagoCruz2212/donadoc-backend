import { enSegundoPlano } from './segundo-plano';

describe('enSegundoPlano', () => {
  const original = process.env.VERCEL;
  afterEach(() => {
    if (original === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = original;
  });

  it('fuera de Vercel no espera la tarea', async () => {
    delete process.env.VERCEL;
    let terminada = false;
    await enSegundoPlano(new Promise((r) => setTimeout(() => { terminada = true; r(undefined); }, 30)));
    expect(terminada).toBe(false);
  });

  it('en Vercel espera a que la tarea termine', async () => {
    process.env.VERCEL = '1';
    let terminada = false;
    await enSegundoPlano(new Promise((r) => setTimeout(() => { terminada = true; r(undefined); }, 30)));
    expect(terminada).toBe(true);
  });

  it('un fallo no se propaga y llama a alFallar (con o sin Vercel)', async () => {
    const alFallar = jest.fn();
    process.env.VERCEL = '1';
    await expect(enSegundoPlano(Promise.reject(new Error('smtp caído')), alFallar)).resolves.toBeUndefined();
    expect(alFallar).toHaveBeenCalledTimes(1);
    delete process.env.VERCEL;
    await enSegundoPlano(Promise.reject(new Error('smtp caído')), alFallar);
    await new Promise((r) => setTimeout(r, 5));
    expect(alFallar).toHaveBeenCalledTimes(2);
  });
});
