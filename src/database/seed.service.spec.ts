import * as bcrypt from 'bcryptjs';
import { SeedService } from './seed.service';

function crear(env: Record<string, unknown>, opciones: { org?: unknown; existeUsuario?: boolean } = {}) {
  const cfg = { get: (k: string) => env[k] };
  const tenants = { findByKey: jest.fn(async () => opciones.org ?? null), crear: jest.fn(async () => ({ id: 'org-nueva' })) };
  const users = { existe: jest.fn(async () => opciones.existeUsuario ?? false), crear: jest.fn(async () => undefined) };
  return { svc: new SeedService(cfg as never, tenants as never, users as never), tenants, users };
}
const base = { SEED_ENABLED: true, SEED_ADMIN_PASSWORD: 'Clave-Demo-1', SEED_TENANT_KEY: 'pk_demo', SEED_ADMIN_EMAIL: 'Coordinador@Demo.Local' };

describe('SeedService (datos de demostración)', () => {
  it('con SEED_ENABLED en falso no hace nada', async () => {
    const { svc, tenants, users } = crear({ ...base, SEED_ENABLED: false });
    await svc.onApplicationBootstrap();
    expect(tenants.findByKey).not.toHaveBeenCalled();
    expect(users.crear).not.toHaveBeenCalled();
  });

  it('con la contraseña vacía no crea el usuario demo (no hay contraseñas en el código)', async () => {
    const { svc, users } = crear({ ...base, SEED_ADMIN_PASSWORD: '' });
    await svc.onApplicationBootstrap();
    expect(users.crear).not.toHaveBeenCalled();
  });

  it('crea la organización y el usuario con el correo en minúsculas y la clave cifrada con bcrypt', async () => {
    const { svc, tenants, users } = crear(base);
    await svc.onApplicationBootstrap();
    expect(tenants.crear).toHaveBeenCalledWith({ nombre: 'Clínica Demo', clavePublica: 'pk_demo' });
    const datos = (users.crear.mock.calls[0] as unknown as [{ correo: string; hashClave: string; rol: string; organizacionId: string }])[0];
    expect(datos).toMatchObject({ correo: 'coordinador@demo.local', rol: 'ADMIN_ORG', organizacionId: 'org-nueva' });
    expect(datos.hashClave).not.toContain('Clave-Demo-1');
    expect(await bcrypt.compare('Clave-Demo-1', datos.hashClave)).toBe(true);
  });

  it('es idempotente: no vuelve a crear la organización ni el usuario si ya existen', async () => {
    const { svc, tenants, users } = crear(base, { org: { id: 'org-1' }, existeUsuario: true });
    await svc.onApplicationBootstrap();
    expect(tenants.crear).not.toHaveBeenCalled();
    expect(users.crear).not.toHaveBeenCalled();
  });
});
