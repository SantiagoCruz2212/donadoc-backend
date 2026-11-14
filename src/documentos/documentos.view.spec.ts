import { toDocumentoVista } from './documentos.view';
import { Documento } from './entities/documento.entity';

describe('toDocumentoVista', () => {
  const base = { id: 'd1', casoId: 'c1', tipo: 'HISTORIA_EXTERNA', estado: 'COMPLETO', hashSha256: 'abc', creadoEn: new Date() } as Documento;

  it('nunca expone la ruta interna del archivo y deja solo el nombre original', () => {
    const v = toDocumentoVista({ ...base, rutaArchivo: 'c1/3f2504e0-4f89-41d3-9a0c-0305e82c3301-historia.pdf' });
    expect(v).not.toHaveProperty('rutaArchivo');
    expect(v.nombreArchivo).toBe('historia.pdf');
  });

  it('sin archivo, el nombre es null', () => {
    expect(toDocumentoVista({ ...base, rutaArchivo: null }).nombreArchivo).toBeNull();
  });
});
