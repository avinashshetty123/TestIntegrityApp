import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ProctoringModule } from './proctoring/proctoring.module';
import { ProctoringAlert } from './proctoring/entities/proctoring-alert.entity';
import { FaceVerification } from './proctoring/entities/face-verification.entity';
import { MeetingSession } from './meetings/entities/meeting-session.entity';
import { MeetingLockRequest } from './meetings/entities/meeting-lock-request.entity';
import { JoinRequest } from './meetings/entities/join-request.entity';
@Module({
  imports: [
  TypeOrmModule.forRoot({
    type:'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME || 'admin',
    password: process.env.DATABASE_PASSWORD || 'admin123',
    database: process.env.DATABASE_NAME || 'TestIntegrityDb',
    entities: [User,Submission,Question,Answer,Test,Result,Meeting,ProctoringAlert,FaceVerification,MeetingSession,MeetingLockRequest,JoinRequest
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
    MeetingsModule,
    CloudinaryModule,
    ProctoringModule
    
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
      consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
