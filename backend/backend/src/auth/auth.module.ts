// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './statergy/jwt.statergy';
import { GoogleStrategy } from './statergy/google.statergy';
import { ConfigModule, ConfigService } from '@nestjs/config'; // 👈 Import these

@Module({
  imports: [
    UserModule,
    PassportModule,
    // This is the correct way to get the env value
    JwtModule.registerAsync({
      imports: [ConfigModule], // 👈 Import ConfigModule so ConfigService is available
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET')||"JWT_SECRET", // 👈 Use ConfigService to get the value
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService], // 👈 Inject ConfigService as a dependency
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}