import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Test } from './entities/test.entity';
import { Question } from './entities/questions.entity';
import { Submission } from './entities/submissions.entity';
import { Answer } from './entities/answers.entity';
import { TestService } from './tests.service';
import { TestController } from './tests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Test, Question, Submission, Answer])],
  controllers: [TestController],
  providers: [TestService],
})
export class TestsModule {}
