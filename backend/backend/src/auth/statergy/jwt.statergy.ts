import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          // 1) Prefer Authorization header
          if (req.headers.authorization?.startsWith('Bearer ')) {
            return req.headers.authorization.split(' ')[1];
          }
          // 2) Otherwise, try cookie
          if (req.cookies && req.cookies.accessToken) {
            return req.cookies.accessToken;
          }
          console.log(req.cookies.accessToken);
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
