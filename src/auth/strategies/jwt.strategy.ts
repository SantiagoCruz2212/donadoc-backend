import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '@common/types/auth-user';
import { JWT_KEYS, JwtKeys } from '../keys';

interface JwtPayload {
  sub: string;
  org: string | null;
  rol: string;
  typ: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(JWT_KEYS) keys: JwtKeys) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: keys.publicKey,
      algorithms: ['RS256'],
      ignoreExpiration: false,
    });
  }

  /** Solo se aceptan tokens del personal (typ: staff); el token de otra audiencia se rechaza. */
  validate(payload: JwtPayload): AuthUser {
    if (payload.typ !== 'staff') throw new UnauthorizedException('Token no válido');
    return { userId: payload.sub, organizacionId: payload.org, rol: payload.rol };
  }
}
