import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TestsModule } from './tests/tests.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { LivekitModule } from './livekit/livekit.module';
import { DeepfakeModule } from './deepfake/deepfake.module';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'testdb',
      autoLoadEntities: true,
      synchronize: true, // ❌ turn off in production
    }),
    ConfigModule.forRoot({
     isGlobal:true,
    }),
    ThrottlerModule.forRoot([{
      ttl:600000,
      limit:5,
    }]),
    CacheModule.register({
      isGlobal:true,
      ttl:30000,
      max:100,
    }),

    

    AuthModule,
    UserModule,
    TestsModule,
    LivekitModule,
    DeepfakeModule,
    
  ],
})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
      consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
