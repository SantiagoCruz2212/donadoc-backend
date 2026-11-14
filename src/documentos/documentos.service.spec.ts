import { createHash } from 'crypto';
import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DocumentosService, MAX_CARACTERES_IA } from './documentos.service';

jest.mock('pdf-parse', () => ({ __esModule: true, default: jest.fn(async () => ({ text: '  Texto extraído del PDF  \n' })) }));
import pdfParse from 'pdf-parse';

const user = { userId: 'u1', organizacionId: 'org-1', rol: 'OPERADOR' };
const archivo = (nombre: string, mimetype: string, contenido = 'hola') => ({ originalname: nombre, mimetype, buffer: Buffer.from(contenido) }) as never;

function crear(opciones: { casoLanza?: boolean; docs?: unknown[]; doc?: unknown; almacenado?: Buffer } = {}) {
  const casos = {
    obtenerEntidad: jest.fn(async () => {
      if (opciones.casoLanza) throw new NotFoundException('Caso no encontrado');
      return { id: 'caso-1' };
    }),
  };
  const almacenamiento = { put: jest.fn(async () => undefined), get: jest.fn(async () => opciones.almacenado ?? Buffer.from('contenido')) };
  const repo = {
    create: jest.fn((x: object) => ({ ...x })),
    save: jest.fn(async (x: Record<string, unknown>) => ({ ...x, id: 'doc-1', creadoEn: new Date('2026-11-01T10:00:00Z') })),
    find: jest.fn(async () => opciones.docs ?? []),
    findOne: jest.fn(async () => opciones.doc ?? null),
  };
  const audit = { log: jest.fn(async () => undefined) };
  const svc = new DocumentosService(repo as never, casos as never, almacenamiento as never, audit as never);
  return { svc, casos, almacenamiento, repo, audit };
}

describe('DocumentosService.subirArchivo (validación)', () => {
  it('sin archivo responde 400', async () => {
    await expect(crear().svc.subirArchivo(user, 'caso-1', undefined)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una extensión no permitida (.exe) con 422', async () => {
    await expect(crear().svc.subirArchivo(user, 'caso-1', archivo('virus.exe', 'application/octet-stream'))).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rechaza un .pdf cuyo tipo MIME no es application/pdf', async () => {
    await expect(crear().svc.subirArchivo(user, 'caso-1', archivo('falso.pdf', 'text/plain'))).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rechaza un .pdf que no empieza con la firma %PDF-', async () => {
    await expect(crear().svc.subirArchivo(user, 'caso-1', archivo('falso.pdf', 'application/pdf', 'esto es texto'))).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('acepta un .pdf con la firma %PDF-', async () => {
    const r = await crear().svc.subirArchivo(user, 'caso-1', archivo('real.pdf', 'application/pdf', '%PDF-1.7 contenido'));
    expect(r.id).toBe('doc-1');
  });

  it('rechaza un .txt cuyo tipo MIME no es text/plain', async () => {
    await expect(crear().svc.subirArchivo(user, 'caso-1', archivo('falso.txt', 'application/pdf'))).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('acepta la extensión sin distinguir mayúsculas (.TXT)', async () => {
    const r = await crear().svc.subirArchivo(user, 'caso-1', archivo('HISTORIA.TXT', 'text/plain'));
    expect(r.id).toBe('doc-1');
  });

  it('no guarda nada en el almacenamiento si el archivo es inválido', async () => {
    const { svc, almacenamiento } = crear();
    await svc.subirArchivo(user, 'caso-1', archivo('virus.exe', 'x')).catch(() => undefined);
    expect(almacenamiento.put).not.toHaveBeenCalled();
  });
});

describe('DocumentosService: guardado', () => {
  it('guarda el archivo, calcula la huella SHA-256 y audita la creación', async () => {
    const { svc, almacenamiento, repo, audit } = crear();
    const v = await svc.subirArchivo(user, 'caso-1', archivo('historia.txt', 'text/plain', 'contenido de prueba'));
    const esperado = createHash('sha256').update('contenido de prueba').digest('hex');
    expect(almacenamiento.put).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ casoId: 'caso-1', tipo: 'HISTORIA_EXTERNA', estado: 'COMPLETO', hashSha256: esperado }));
    expect(v.hashSha256).toBe(esperado);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'documento', accion: 'CREAR', entidadId: 'doc-1' }));
  });

  it('la clave de almacenamiento empieza por el id del caso y termina con el nombre limpio', async () => {
    const { svc, almacenamiento } = crear();
    await svc.subirArchivo(user, 'caso-1', archivo('mi historia (1).txt', 'text/plain'));
    const clave = (almacenamiento.put.mock.calls[0] as unknown as [string])[0];
    expect(clave.startsWith('caso-1/')).toBe(true);
    expect(clave.endsWith('mi_historia__1_.txt')).toBe(true);
  });

  it('neutraliza nombres con ../ para impedir salirse de la carpeta (path traversal)', async () => {
    const { svc, almacenamiento } = crear();
    await svc.subirArchivo(user, 'caso-1', archivo('../../etc/passwd.txt', 'text/plain'));
    const clave = (almacenamiento.put.mock.calls[0] as unknown as [string])[0];
    const segmentos = clave.split('/');
    expect(segmentos).toHaveLength(2); // solo «caso/archivo»: las barras del nombre se reemplazaron
    expect(segmentos).not.toContain('..'); // ningún segmento sube de carpeta
    expect(clave).not.toContain('\\');
  });

  it('la vista pública no expone la ruta interna del archivo', async () => {
    const v = (await crear().svc.subirArchivo(user, 'caso-1', archivo('h.txt', 'text/plain'))) as unknown as Record<string, unknown>;
    expect(v).not.toHaveProperty('rutaArchivo');
    expect(JSON.stringify(v)).not.toContain('caso-1/');
  });

  it('subirTexto guarda el texto pegado como historia-pegada.txt', async () => {
    const { svc, almacenamiento } = crear();
    await svc.subirTexto(user, 'caso-1', 'Diagnóstico principal: TCE');
    const [clave, datos] = almacenamiento.put.mock.calls[0] as unknown as [string, Buffer];
    expect(clave.endsWith('historia-pegada.txt')).toBe(true);
    expect(datos.toString('utf8')).toBe('Diagnóstico principal: TCE');
  });

  it('si el caso no es de la organización, responde 404 y no guarda ni archivo ni registro', async () => {
    const { svc, almacenamiento, repo } = crear({ casoLanza: true });
    await expect(svc.subirTexto(user, 'ajeno', 'texto')).rejects.toBeInstanceOf(NotFoundException);
    expect(almacenamiento.put).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe('DocumentosService: consulta', () => {
  it('listar excluye los documentos eliminados lógicamente', async () => {
    const { svc } = crear({ docs: [{ id: 'a', rutaArchivo: 'c/1-a.txt', eliminadoEn: null }, { id: 'b', rutaArchivo: 'c/2-b.txt', eliminadoEn: new Date() }] });
    const lista = await svc.listar(user, 'caso-1');
    expect(lista.map((d) => d.id)).toEqual(['a']);
  });

  it('obtenerDeCaso responde 404 si el documento no existe en el caso', async () => {
    await expect(crear({ doc: null }).svc.obtenerDeCaso(user, 'caso-1', 'x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('obtenerDeCaso responde 404 si el documento está eliminado', async () => {
    await expect(crear({ doc: { id: 'd', eliminadoEn: new Date() } }).svc.obtenerDeCaso(user, 'caso-1', 'd')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('obtenerDeCaso verifica primero que el caso sea de la organización', async () => {
    const { svc, casos } = crear({ doc: { id: 'd', eliminadoEn: null } });
    await svc.obtenerDeCaso(user, 'caso-1', 'd');
    expect(casos.obtenerEntidad).toHaveBeenCalledWith(user, 'caso-1');
  });
});

describe('DocumentosService.leerTexto', () => {
  it('lee un .txt como UTF-8 y recorta los espacios', async () => {
    const { svc } = crear({ almacenado: Buffer.from('  Grupo sanguíneo: O+  \n') });
    expect(await svc.leerTexto({ rutaArchivo: 'c/1-h.txt' } as never)).toBe('Grupo sanguíneo: O+');
  });

  it('recorta el texto a MAX_CARACTERES_IA para controlar los tokens enviados a la IA', async () => {
    const { svc } = crear({ almacenado: Buffer.from('a'.repeat(MAX_CARACTERES_IA + 5000)) });
    expect((await svc.leerTexto({ rutaArchivo: 'c/1-h.txt' } as never)).length).toBe(MAX_CARACTERES_IA);
  });

  it('extrae el texto de un .pdf con pdf-parse', async () => {
    const { svc } = crear();
    expect(await svc.leerTexto({ rutaArchivo: 'c/1-h.pdf' } as never)).toBe('Texto extraído del PDF');
    expect(pdfParse).toHaveBeenCalled();
  });

  it('un PDF dañado responde 422 y no un error interno', async () => {
    (pdfParse as jest.Mock).mockRejectedValueOnce(new Error('Invalid PDF structure'));
    await expect(crear().svc.leerTexto({ rutaArchivo: 'c/1-h.pdf' } as never)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('un documento sin archivo responde 404', async () => {
    await expect(crear().svc.leerTexto({ rutaArchivo: null } as never)).rejects.toBeInstanceOf(NotFoundException);
  });
});
