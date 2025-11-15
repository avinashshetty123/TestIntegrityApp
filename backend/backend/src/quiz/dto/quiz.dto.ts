import { IsString, IsNumber, IsArray, IsOptional, IsEnum } from 'class-validator';

export class SendQuestionDto {
  @IsString()
  question: string;

@IsEnum(['MCQ', 'SHORT_ANSWER', 'TRUE_FALSE'])
type: 'MCQ' | 'SHORT_ANSWER' | 'TRUE_FALSE';


  @IsArray()
  @IsOptional()
  options?: string[];

  @IsString()
  @IsOptional()
  correctAnswer?: string;

  @IsNumber()
  timeLimit: number;
}

export class SubmitAnswerDto {
  @IsString()
  quizId: string;

  @IsString()
  answer: string;

  @IsNumber()
  responseTime: number;
}

export class ImportQuestionDto {
  @IsString()
  testId: string;

  @IsArray()
  questionIds: string[];
}