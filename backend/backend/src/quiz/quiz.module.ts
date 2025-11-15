import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { QuizGateway } from './quiz.gateway';
import { LiveQuiz } from './entities/live-quiz.entity';
import { QuizResponse } from './entities/quiz-response.entity';
import { forwardRef } from '@nestjs/common';
import { MeetingsModule } from '../meetings/meetings.module';
import { User } from 'src/user/entities/user.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiveQuiz, QuizResponse,User]),
     forwardRef(() => MeetingsModule),
     UserModule
  ],
  controllers: [QuizController],
  providers: [QuizService, QuizGateway],
  exports: [QuizService],
})
export class QuizModule {}