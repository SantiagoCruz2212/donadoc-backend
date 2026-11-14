import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SugerenciasService } from './sugerencias.service';

const user = { userId: 'u1', organizacionId: 'org-1', rol: 'OPERADOR' };

function crear(opciones: { sugerencia?: Record<string, unknown> | null; extraccion?: Record<string, unknown> | null; casoLanza?: boolean } = {}) {
  const base = { id: 's1', extraccionId: 'e1', campo: 'diagnosticoPrincipal', valorSugerido: 'TCE severo', confianza: 0.9, decision: 'PENDIENTE', valorFinal: null, decididoPor: null, decididoEn: null };
  const sug = opciones.sugerencia === null ? null : { ...base, ...(opciones.sugerencia ?? {}) };
  const sugerencias = { findOne: jest.fn(async () => sug), save: jest.fn(async (x: unknown) => x) };
  const extracciones = { findOne: jest.fn(async () => (opciones.extraccion === null ? null : { id: 'e1', casoId: 'caso-1', ...(opciones.extraccion ?? {}) })) };
  const casos = { obtenerEntidad: jest.fn(async () => { if (opciones.casoLanza) throw new NotFoundException('Caso no encontrado'); return {}; }) };
  const audit = { log: jest.fn(async () => undefined) };
  const svc = new SugerenciasService(sugerencias as never, extracciones as never, casos as never, audit as never);
  return { svc, sug, sugerencias, casos, audit };
}

describe('SugerenciasService.decidir (revisión humana: la IA propone, la persona decide)', () => {
  it('ACEPTADA guarda como valor final el valor sugerido', async () => {
    const { svc } = crear();
    const r = await svc.decidir(user, 's1', { decision: 'ACEPTADA' });
    expect(r).toMatchObject({ decision: 'ACEPTADA', valorFinal: 'TCE severo' });
  });

  it('MODIFICADA guarda el valor corregido sin espacios sobrantes', async () => {
    const { svc } = crear();
    const r = await svc.decidir(user, 's1', { decision: 'MODIFICADA', valorFinal: '  Muerte encefálica por TCE  ' });
    expect(r).toMatchObject({ decision: 'MODIFICADA', valorFinal: 'Muerte encefálica por TCE' });
  });

  it('MODIFICADA sin valorFinal responde 400 con el detalle del campo', async () => {
    const { svc } = crear();
    const e = await svc.decidir(user, 's1', { decision: 'MODIFICADA' }).catch((x) => x);
    expect(e).toBeInstanceOf(BadRequestException);
    expect((e.getResponse() as { error: { property: string }[] }).error[0].property).toBe('valorFinal');
  });

  it('MODIFICADA con valorFinal en blanco también responde 400', async () => {
    await expect(crear().svc.decidir(user, 's1', { decision: 'MODIFICADA', valorFinal: '   ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('RECHAZADA deja el valor final en nulo', async () => {
    const r = await crear().svc.decidir(user, 's1', { decision: 'RECHAZADA', valorFinal: 'ignorado' });
    expect(r).toMatchObject({ decision: 'RECHAZADA', valorFinal: null });
  });

  it('una sugerencia ya revisada responde 409 y no se modifica', async () => {
    const { svc, sugerencias } = crear({ sugerencia: { decision: 'ACEPTADA' } });
    await expect(svc.decidir(user, 's1', { decision: 'RECHAZADA' })).rejects.toBeInstanceOf(ConflictException);
    expect(sugerencias.save).not.toHaveBeenCalled();
  });

  it('una sugerencia inexistente responde 404', async () => {
    await expect(crear({ sugerencia: null }).svc.decidir(user, 'x', { decision: 'ACEPTADA' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('una sugerencia cuya extracción no existe responde 404', async () => {
    await expect(crear({ extraccion: null }).svc.decidir(user, 's1', { decision: 'ACEPTADA' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('una sugerencia de un caso de otra organización aparece como «no encontrada» y no se guarda', async () => {
    const { svc, sugerencias } = crear({ casoLanza: true });
    await expect(svc.decidir(user, 's1', { decision: 'ACEPTADA' })).rejects.toBeInstanceOf(NotFoundException);
    expect(sugerencias.save).not.toHaveBeenCalled();
  });

  it('registra quién decidió y cuándo', async () => {
    const { svc, sug } = crear();
    await svc.decidir(user, 's1', { decision: 'ACEPTADA' });
    expect(sug).toMatchObject({ decididoPor: 'u1' });
    expect((sug as unknown as { decididoEn: Date }).decididoEn).toBeInstanceOf(Date);
  });

  it('audita la decisión con el valor anterior y el nuevo', async () => {
    const { svc, audit } = crear();
    await svc.decidir(user, 's1', { decision: 'ACEPTADA' });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      entidad: 'sugerencia_ia', accion: 'EDITAR', valorAnterior: { decision: 'PENDIENTE', valorFinal: null }, valorNuevo: { decision: 'ACEPTADA', valorFinal: 'TCE severo' },
    }));
  });
});
