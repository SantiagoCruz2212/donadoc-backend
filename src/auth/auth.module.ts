import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '@audit/audit.module';
import { CorreoModule } from '@correo/correo.module';
import { OtpModule } from '@otp/otp.module';
import { TenantsModule } from '@tenants/tenants.module';
import { UsersModule } from '@users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JWT_KEYS, JwtKeys, KeysModule } from './keys';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    AuditModule,
    CorreoModule,
    OtpModule,
    TenantsModule,
    UsersModule,
    KeysModule,
    JwtModule.registerAsync({
      imports: [KeysModule],
      inject: [ConfigService, JWT_KEYS],
      useFactory: (cfg: ConfigService, keys: JwtKeys) => ({
        privateKey: keys.privateKey,
        publicKey: keys.publicKey,
        signOptions: { algorithm: 'RS256' as const, expiresIn: cfg.get<string>('JWT_EXPIRES_IN') ?? '15m' } as never,
        verifyOptions: { algorithms: ['RS256' as const] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
