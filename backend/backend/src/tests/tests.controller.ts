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
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { TestService } from './tests.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole, User } from 'src/user/entities/user.entity';
import { QuestionType } from './entities/questions.entity';
import {
  CreateTestDto,
  SubmitAnswersDto,
  UpdateStudentMarksDto,
  SubmitTestDto,
} from './dto/test.dto';
import { ApiOperation,ApiParam } from '@nestjs/swagger';
import { Question } from './entities/questions.entity';
@ApiTags('Tests')
@ApiBearerAuth()
@Controller('tests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestController {
  constructor(private readonly testService: TestService) {}

  /**
   * Tutor/Admin creates a test
   */
  @Roles(UserRole.TUTOR, UserRole.ADMIN)
  @Post('create')
  @ApiBody({ type: CreateTestDto })
async createTest(@Req() req, @Body() body: any) {
  const user = req.user as any; // decoded from JWT
  console.log('Decoded user:', user);

  const tutor = {
    id: user.userId, // ✅ map userId -> id
    role: user.role,
    institutionName: body.institutionName ?? 'Test Institute', // optional
  } as any;

  return this.testService.createTest(
    tutor,
    body.title,
    body.description,
    body.questions || [],
    body.institutionName,
  );
}
@Get('allsubmissions')
async getStudentSubmission(@Req() req) {
  const student = req.user.userId;
 
  return this.testService.getStudentSubmission(student);
}




  /**
   * Student submits answers to a test
   */
// @Roles(UserRole.STUDENT)
// @Post(':testId/submit')
// async submitTest(
//   @Req() req,
//   @Param('testId', ParseIntPipe) testId: number,
// ) {
//   const student = req.user as User;
//   return this.testService.finalizeSubmission(student, testId);
// }
// @Roles(UserRole.STUDENT)
// @Get(':testId/progress')
// async getProgress(
//   @Req() req,
//   @Param('testId', ParseIntPipe) testId: number,
// ) {
//   const student = req.user as User;
//   return this.testService.getProgress(student, testId);
// }


  @Roles(UserRole.TUTOR, UserRole.ADMIN)
  @Get(':testId/submissions')
  async getAllSubmissions(@Param('testId', ParseIntPipe) testId: number) {
    return this.testService.getSubmissionsForTest(testId);
  }

@Roles(UserRole.TUTOR, UserRole.ADMIN)
@Patch('submission/:submissionId/grade')
@ApiBody({ type: UpdateStudentMarksDto })
async updateStudentMarks(
  @Param('submissionId', ParseIntPipe) submissionId: number,
  @Body() body: UpdateStudentMarksDto,
) {
  console.log('Received update request:', body);
  // ✅ Pass overallFeedback to service method
  return this.testService.updateStudentMarks(
    submissionId, 
    body.updatedScores, 
    body.overallFeedback // ✅ This was missing
  );
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

  @Roles(UserRole.STUDENT)
  @Get('results')
  async getStudentResults(@Req() req) {
    const student = req.user as User;
    return this.testService.getStudentResults(student.id);
  }

  @Roles(UserRole.TUTOR)
  @Get('tutor')
  async getTutorTests(@Req() req) {
    const tutor = req.user as User;
    return this.testService.getTutorTests(tutor.id);
  }

  @Get()
  async getAllTests(@Req() req) {
    const user = req.user as User;
    return this.testService.getAllTests({
      institutionName: user.institutionName,
    });
  }

  @Get(':testId')
  async getTestById(@Param('testId', ParseIntPipe) testId: number) {
    return this.testService.getTestById(testId);
  }
@Roles(UserRole.STUDENT)
@Post(':testId/submit')
async submitAnswers(
  @Req() req,
  @Param('testId') testId: number,
  @Body() body: { answers: { questionId: number; response?: string | string[] }[],violations:number },
) {
  const student = req.user; // ✅ user from auth guard
  console.log(student);
  if (!student || !student.userId) {
    throw new UnauthorizedException('Student not found in request');
  }
  return this.testService.submitAnswers(student, testId, body.answers,body.violations);
}


  @Get(':id/questions')
  @ApiOperation({ summary: 'Get test questions for student (without correct answers)' })
  @ApiParam({ name: 'id', type: Number })
  async getStudentQuestions(@Param('id',ParseIntPipe) id: number,@Req() req) {
    const studentid=req.user.userId;
    const questions = await this.testService.getStudentQuestions(id,studentid);
    if (!questions) throw new NotFoundException('Test not found');
    return questions;
  }

  @Roles(UserRole.TUTOR, UserRole.ADMIN)
@Get(':testId/stats')
async getTestStats(@Param('testId') testId: number) {
  return this.testService.getTestStats(testId);
}

@Roles(UserRole.TUTOR, UserRole.ADMIN)
@Patch(':testId/questions')
async updateQuestions(
  @Param('testId') testId: number,
  @Body() body: {
    add?: Partial<Question>[];
    update?: Partial<Question>[];
    remove?: number[];
  }
) {
  return this.testService.updateQuestions(testId, body);
}
@Post(':testId/publish')
@Roles(UserRole.TUTOR)
async publishTest(@Param('testId' ,ParseIntPipe) testId:number)
{
  return this.testService.publishTest(testId);
}
@Post(':testId/unpublish')
@Roles(UserRole.TUTOR)
async unpublishTest(@Param('testId', ParseIntPipe) testId:number)
{
  return this.testService.unpublishTest(testId);
}

// Add these methods to your TestController:

@Get('submission/:submissionId/result')
async getSubmissionResult(@Param('submissionId', ParseIntPipe) submissionId: number) {
  return this.testService.getSubmissionResult(submissionId);
}



@Get(':testId/results-detailed')
async getDetailedResults(@Param('testId', ParseIntPipe) testId: number) {
  return this.testService.getTestResults(testId);
}

@Delete('submission/:submissionId')
async deleteSubmission(@Param('submissionId', ParseIntPipe) submissionId: number) {
return this.testService.deleteSubmission(submissionId);
}



}
