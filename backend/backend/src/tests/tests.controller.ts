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
import { ApiTags, ApiBearerAuth, ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { TestService } from './tests.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole, User } from 'src/user/entities/user.entity';
import { CreateTestDto, UpdateStudentMarksDto } from './dto/test.dto';
import { Question } from './entities/questions.entity';

@ApiTags('Tests')
@ApiBearerAuth()
@Controller('tests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestController {
  constructor(private readonly testService: TestService) {}

  // ── Static routes first (must be before :testId) ──────────────────────────

  @Roles(UserRole.TUTOR, UserRole.ADMIN)
  @Post('create')
  @ApiBody({ type: CreateTestDto })
  async createTest(@Req() req, @Body() body: any) {
    const user = req.user as any;
    const tutor = {
      id: user.userId,
      role: user.role,
      institutionName: body.institutionName ?? 'Test Institute',
    } as any;
    return this.testService.createTest(
      tutor,
      body.title,
      body.description,
      body.questions || [],
      body.institutionName,
    );
  }

  @Roles(UserRole.STUDENT)
  @Get('results')
  async getStudentResults(@Req() req) {
    const studentId = req.user.userId;
    return this.testService.getStudentResults(studentId);
  }

  @Roles(UserRole.TUTOR)
  @Get('tutor')
  async getTutorTests(@Req() req) {
    return this.testService.getTutorTests(req.user.userId);
  }

  @Get('allsubmissions')
  async getStudentSubmission(@Req() req) {
    return this.testService.getStudentSubmission(req.user.userId);
  }

  @Roles(UserRole.TUTOR, UserRole.ADMIN)
  @Patch('submission/:submissionId/grade')
  @ApiBody({ type: UpdateStudentMarksDto })
  async updateStudentMarks(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Body() body: UpdateStudentMarksDto,
  ) {
    return this.testService.updateStudentMarks(submissionId, body.updatedScores, body.overallFeedback);
  }

  @Get('submission/:submissionId/result')
  async getSubmissionResult(@Param('submissionId', ParseIntPipe) submissionId: number) {
    return this.testService.getSubmissionResult(submissionId);
  }

  @Delete('submission/:submissionId')
  async deleteSubmission(@Param('submissionId', ParseIntPipe) submissionId: number) {
    return this.testService.deleteSubmission(submissionId);
  }

  @Get()
  async getAllTests(@Req() req) {
    const user = req.user as any;
    return this.testService.getAllTests({ institutionName: user.institutionName });
  }

  // ── Parameterized :testId routes ──────────────────────────────────────────

  @Get(':testId')
  async getTestById(@Param('testId', ParseIntPipe) testId: number) {
    return this.testService.getTestById(testId);
  }

  @Roles(UserRole.TUTOR, UserRole.ADMIN)
  @Get(':testId/submissions')
  async getAllSubmissions(@Param('testId', ParseIntPipe) testId: number) {
    return this.testService.getSubmissionsForTest(testId);
  }

  @Get(':testId/results')
  async getResults(@Param('testId', ParseIntPipe) testId: number) {
    return this.testService.getTestResults(testId);
  }

  @Get(':testId/results-detailed')
  async getDetailedResults(@Param('testId', ParseIntPipe) testId: number) {
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

  @Roles(UserRole.TUTOR, UserRole.ADMIN)
  @Get(':testId/stats')
  async getTestStats(@Param('testId', ParseIntPipe) testId: number) {
    return this.testService.getTestStats(testId);
  }

  @Roles(UserRole.TUTOR, UserRole.ADMIN)
  @Patch(':testId/questions')
  async updateQuestions(
    @Param('testId', ParseIntPipe) testId: number,
    @Body() body: { add?: Partial<Question>[]; update?: Partial<Question>[]; remove?: number[] },
  ) {
    return this.testService.updateQuestions(testId, body);
  }

  @Roles(UserRole.TUTOR)
  @Post(':testId/publish')
  async publishTest(@Param('testId', ParseIntPipe) testId: number) {
    return this.testService.publishTest(testId);
  }

  @Roles(UserRole.TUTOR)
  @Post(':testId/unpublish')
  async unpublishTest(@Param('testId', ParseIntPipe) testId: number) {
    return this.testService.unpublishTest(testId);
  }

  @Roles(UserRole.STUDENT)
  @Post(':testId/submit')
  async submitAnswers(
    @Req() req,
    @Param('testId', ParseIntPipe) testId: number,
    @Body() body: { answers: { questionId: number; response?: string | string[] }[]; violations: number },
  ) {
    const student = req.user;
    if (!student?.userId) throw new UnauthorizedException('Student not found in request');
    return this.testService.submitAnswers(student, testId, body.answers, body.violations);
  }

  @Get(':id/questions')
  @ApiOperation({ summary: 'Get test questions for student (without correct answers)' })
  @ApiParam({ name: 'id', type: Number })
  async getStudentQuestions(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const questions = await this.testService.getStudentQuestions(id, req.user.userId);
    if (!questions) throw new NotFoundException('Test not found');
    return questions;
  }
}
