/**
 * Ejecutor de migraciones para el paso de despliegue:  npm run migration:run  (variables DB_* en el entorno).
 * En entornos desplegados las migraciones corren UNA vez por versión, antes de levantar las réplicas;
 * TypeORM no bloquea y dos réplicas competirían. Solo en local corren al arrancar la aplicación.
 */
import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export const MIGRACIONES = [join(__dirname, 'migrations', '{ddl,dml}', '*.{js,ts}')];

async function main(): Promise<void> {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    namingStrategy: new SnakeNamingStrategy(),
    migrations: MIGRACIONES,
    migrationsTableName: 'schema_migrations',
    migrationsTransactionMode: 'each',
  });
  await ds.initialize();
  const ejecutadas = await ds.runMigrations({ transaction: 'each' });
  console.log(ejecutadas.length ? `Migraciones aplicadas: ${ejecutadas.map((m) => m.name).join(', ')}` : 'Base de datos al día: no hay migraciones pendientes.');
  await ds.destroy();
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Error al migrar:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
