import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { TestService } from './tests.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole, User } from 'src/user/entities/user.entity';
import { QuestionType } from './entities/questions.entity';

@Controller('tests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestController {
  constructor(private readonly testService: TestService) {}

  /**
   * Tutor/Admin creates a test
   */
  @Roles(UserRole.TUTOR, UserRole.ADMIN)

@Post('create')
async createTest(
    @Req() req,
    @Body()
    body: {
      title: string;
      description: string;
      questions: {
        questionText: string;
        type: QuestionType;
        options?: string[];
        correctAnswers?: string[];
        mcqMode?: 'single' | 'multiple';
        marks: number;
        testPic?: string;
        publicId?: string;
      }[];
      institutionName?: string;
    },
  ) {
    const tutor = req.user as User;
    return this.testService.createTest(
      tutor,
      body.title,
      body.description,
      body.questions,
      body.institutionName,
    );
  }

  /**
   * Student submits answers to a test
   */
  @Roles(UserRole.STUDENT)
  @Post(':testId/submit')
  async submitAnswers(
    @Req() req,
    @Param('testId', ParseIntPipe) testId: number,
    @Body() body: { answers: { questionId: number; response: string | string[] }[] },
  ) {
    const student = req.user as User;
    return this.testService.submitAnswers(student, testId, body.answers);
  }

  @Roles(UserRole.TUTOR, UserRole.ADMIN)
  @Get(':testId/submissions')
  async getAllSubmissions(@Param('testId', ParseIntPipe) testId: number) {
    return this.testService.getSubmissionsForTest(testId);
  }

  @Roles(UserRole.TUTOR, UserRole.ADMIN)
  @Patch('submission/:submissionId/grade')
  async updateStudentMarks(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Body() body: { updatedScores: { answerId: number; score: number }[] },
  ) {
    return this.testService.updateStudentMarks(submissionId, body.updatedScores);
  }

  @Get(':testId/results')
  async getResults(@Param('testId', ParseIntPipe) testId: number) {
    return this.testService.getTestResults(testId);
  }

  @Roles(UserRole.TUTOR, UserRole.ADMIN)
  @Delete(':testId')
  async deleteTest(@Req() req, @Param('testId', ParseIntPipe) testId: number) {
    const tutor = req.user as User;
    return this.testService.deleteTest(testId, tutor);
  }

  @Roles(UserRole.TUTOR, UserRole.ADMIN)
  @Patch(':testId/auto-grade-all')
  async autoGradeAllSubmissions(@Param('testId', ParseIntPipe) testId: number) {
    return this.testService.autoGradeAllSubmissions(testId);
  }
}
