import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { crearApp } from './app.factory';

async function bootstrap() {
  const app = await crearApp();
  const cfg = app.get(ConfigService);
  const port = cfg.get<number>('PORT') as number;
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`DonaDoc API escuchando en el puerto ${port} (IA: ${cfg.get('EXTRACTOR_IA_PROVIDER')})`);
}
bootstrap();
