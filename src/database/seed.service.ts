import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { TenantsService } from '@tenants/tenants.service';
import { UsersService } from '@users/users.service';

/**
 * Crea una organización y un usuario de demostración la primera vez (solo si SEED_ENABLED=true).
 * La contraseña sale de la variable de entorno SEED_ADMIN_PASSWORD; nunca está en el código ni en Git.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    private readonly cfg: ConfigService,
    private readonly tenants: TenantsService,
    private readonly users: UsersService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.cfg.get<boolean>('SEED_ENABLED')) return;
    const pass = this.cfg.get<string>('SEED_ADMIN_PASSWORD') ?? '';
    if (!pass) {
      this.logger.warn('SEED_ENABLED=true pero SEED_ADMIN_PASSWORD está vacío: no se crea el usuario demo.');
      return;
    }
    const clave = this.cfg.get<string>('SEED_TENANT_KEY') as string;
    let org = await this.tenants.findByKey(clave);
    if (!org) {
      org = await this.tenants.crear({ nombre: 'Clínica Demo', clavePublica: clave });
      this.logger.log(`Organización demo creada (clave pública ${clave}).`);
    }
    const correo = (this.cfg.get<string>('SEED_ADMIN_EMAIL') as string).toLowerCase();
    if (!(await this.users.existe(org.id, correo))) {
      await this.users.crear({
        organizacionId: org.id, correo, nombre: 'Coordinación Demo', rol: 'ADMIN_ORG', perfil: 'COORDINADOR',
        hashClave: await bcrypt.hash(pass, 10),
      });
      this.logger.log(`Usuario demo creado: ${correo}`);
    }
  }
}
