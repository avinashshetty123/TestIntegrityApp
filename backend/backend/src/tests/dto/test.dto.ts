import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  ValidateNested, 
  IsArray, 
  IsEnum, 
  IsNumber, 
  IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../entities/questions.entity';

// --------------------
// CreateQuestionDto
// --------------------
export class CreateQuestionDto {
  @ApiProperty()
  @IsString()
  questionText: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  correctAnswers?: string[];

  @ApiProperty({ required: false, enum: ['single', 'multiple'] })
  @IsOptional()
  mcqMode?: 'single' | 'multiple';

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  marks: number;
}

// --------------------
// CreateTestDto
// --------------------
export class CreateTestDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({ type: [CreateQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  institutionName?: string;
}

// --------------------
// AnswerDto
export class AnswerDto {
  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  questionId: number;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  response: string[]|string;
}

// --------------------
// UpdatedScoreDto - FIXED
// --------------------
export class UpdatedScoreDto {
  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  answerId: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  score: number;

  @ApiProperty({ required: false }) // ✅ Added
  @IsOptional() // ✅ Added
  @IsString() // ✅ Added
  feedback?: string; // ✅ Now properly decorated
}

// --------------------
// SubmitAnswersDto
// --------------------
export class SubmitAnswersDto {
  @ApiProperty({ type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

// --------------------
// UpdateStudentMarksDto
// --------------------
export class UpdateStudentMarksDto {
  @ApiProperty({ type: [UpdatedScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatedScoreDto)
  updatedScores: UpdatedScoreDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  overallFeedback?: string;
}

// --------------------
// SubmitTestDto
// --------------------
export class SubmitTestDto {
  @ApiProperty()
  @Type(() => Number)
  testId: number;

  @ApiProperty({ type: [AnswerDto] })
  answers: AnswerDto[];
}

export class CreateTestSession {
  @IsNumber()
  testId: number;
  
  @IsString()
  participantId: string;
  
  @IsString()
  participantName: string;
  
  @IsString()
  participantType: 'student';
}

export class UpdateTestSessionDto {
  @IsOptional()
  @IsNumber()
  totalAlerts?: number;

  @IsOptional()
  @IsNumber()
  highSeverityAlerts?: number;

  @IsOptional()
  @IsNumber()
  mediumSeverityAlerts?: number;

  @IsOptional()
  @IsNumber()
  lowSeverityAlerts?: number;

  @IsOptional()
  sessionData?: {
    faceVerificationAttempts: number;
    eyeTrackingScore: number;
    behaviorScore: number;
    deviceViolations: number;
    suspiciousActivities: string[];
  };

  @IsOptional()
  @IsBoolean()
  flagged?: boolean;
}