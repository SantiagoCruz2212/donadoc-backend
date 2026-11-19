import { AlmacenamientoSupabase } from './almacenamiento-supabase';

describe('AlmacenamientoSupabase', () => {
  const alm = new AlmacenamientoSupabase('https://x.supabase.co/', 'llave-secreta', 'documentos');
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as never;
  });

  it('guarda con POST autenticado, upsert y la clave codificada por segmentos', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await alm.put('caso-1/a b.pdf', Buffer.from('x'));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://x.supabase.co/storage/v1/object/documentos/caso-1/a%20b.pdf');
    expect(init.method).toBe('POST');
    expect(init.headers.authorization).toBe('Bearer llave-secreta');
    expect(init.headers['x-upsert']).toBe('true');
  });

  it('lee por el endpoint autenticado y devuelve un Buffer', async () => {
    fetchMock.mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
    const b = await alm.get('caso-1/h.txt');
    expect(fetchMock.mock.calls[0][0]).toBe('https://x.supabase.co/storage/v1/object/authenticated/documentos/caso-1/h.txt');
    expect([...b]).toEqual([1, 2, 3]);
  });

  it('falla con un mensaje claro y sin filtrar la llave cuando Supabase responde error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const error = await alm.put('c/a.txt', Buffer.from('x')).catch((e: Error) => e);
    expect((error as Error).message).toContain('HTTP 403');
    expect((error as Error).message).not.toContain('llave-secreta');
  });

  it('rechaza claves con ".." o segmentos vacíos (path traversal)', async () => {
    await expect(alm.put('../x', Buffer.from('x'))).rejects.toThrow('inválida');
    await expect(alm.get('a//b')).rejects.toThrow('inválida');
  });
});
