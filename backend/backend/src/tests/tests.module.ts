import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Test } from './entities/test.entity';
import { Question } from './entities/questions.entity';
import { Submission } from './entities/submissions.entity';
import { Answer } from './entities/answers.entity';
import { TestService } from './tests.service';
import { TestController } from './tests.controller';
import { MeetingSession } from 'src/meetings/entities/meeting-session.entity';
import { Result } from './entities/results.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Test, Question, Submission, Answer,MeetingSession,Result])],
  controllers: [TestController],
  providers: [TestService],
})
export class TestsModule {}
