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
import { User } from './user/entities/user.entity';
import { Submission } from './tests/entities/submissions.entity';
import { Question } from './tests/entities/questions.entity';
import { Answer } from './tests/entities/answers.entity';
import { Test } from './tests/entities/test.entity';
import { Result } from './tests/entities/results.entity';
import { Meeting } from './meetings/entity/meeting.entity';
import { MeetingsModule } from './meetings/meetings.module';
@Module({
  imports: [
  TypeOrmModule.forRoot({
    type:'postgres',
    host:'localhost',
    port:5432,
    username:'admin',
    password:'admin123',
    database:'TestIntegrityDb',
    entities: [User,Submission,Question,Answer,Test,Result,Meeting
    ],
    synchronize:true,
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
    MeetingsModule
    
  ],
})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
      consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
