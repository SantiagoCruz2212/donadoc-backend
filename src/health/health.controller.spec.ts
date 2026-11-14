import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('/health (liveness) responde ok sin consultar ninguna dependencia', () => {
    const health = { check: jest.fn() };
    const db = { pingCheck: jest.fn() };
    expect(new HealthController(health as never, db as never).vivo()).toEqual({ status: 'ok' });
    expect(health.check).not.toHaveBeenCalled();
    expect(db.pingCheck).not.toHaveBeenCalled();
  });

  it('/health/ready (readiness) verifica la base de datos «postgres»', async () => {
    const health = { check: jest.fn(async (fns: (() => unknown)[]) => { for (const f of fns) await f(); return { status: 'ok' }; }) };
    const db = { pingCheck: jest.fn(async () => ({ postgres: { status: 'up' } })) };
    const r = await new HealthController(health as never, db as never).listo();
    expect(db.pingCheck).toHaveBeenCalledWith('postgres');
    expect(r).toEqual({ status: 'ok' });
  });

  it('si la base de datos cae, la verificación propaga el error (503 en la API)', async () => {
    const health = { check: jest.fn(async (fns: (() => unknown)[]) => { for (const f of fns) await f(); }) };
    const db = { pingCheck: jest.fn(async () => { throw new Error('sin conexión'); }) };
    await expect(new HealthController(health as never, db as never).listo()).rejects.toThrow('sin conexión');
  });
});
