import { generateKeyPairSync } from 'crypto';
import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface JwtKeys {
  privateKey: string;
  publicKey: string;
}
export const JWT_KEYS = 'JWT_KEYS';

/**
 * Par de llaves RS256. Si no vienen por variables de entorno se genera uno efímero
 * (solo desarrollo: los tokens dejan de valer al reiniciar). En producción siempre por entorno.
 */
export function resolveKeys(cfg: ConfigService): JwtKeys {
  const priv = (cfg.get<string>('JWT_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n');
  const pub = (cfg.get<string>('JWT_PUBLIC_KEY') ?? '').replace(/\\n/g, '\n');
  if (priv && pub) return { privateKey: priv, publicKey: pub };
  new Logger('Auth').warn('JWT_PRIVATE_KEY/JWT_PUBLIC_KEY no definidas: se generó un par RS256 efímero (solo desarrollo).');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { privateKey, publicKey };
}

/** Un único par de llaves compartido por la firma (JwtModule) y la verificación (JwtStrategy). */
@Module({
  providers: [{ provide: JWT_KEYS, inject: [ConfigService], useFactory: resolveKeys }],
  exports: [JWT_KEYS],
})
export class KeysModule {}
