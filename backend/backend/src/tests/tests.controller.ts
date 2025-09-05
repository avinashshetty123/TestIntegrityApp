import { Controller, Post, Body, Get, Param, Req, UseGuards } from '@nestjs/common';
import { TestService } from './tests.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';

@Controller('tests')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @UseGuards(JwtAuthGuard,RolesGuard)
  @Roles(UserRole.TUTOR)
  @Post('create')
  async createTest(@Req() req, @Body() body: any) {
    const tutor = req.user; // assume auth middleware gives logged in tutor
    return this.testService.createTest(tutor, body.title, body.description, body.questions);
  }

  @Post(':testId/submit')
  async submitAnswers(@Req() req, @Param('testId') testId: number, @Body() body: any) {
    const student = req.user;
    return this.testService.submitAnswers(student, testId, body.answers);
  }
 @UseGuards(JwtAuthGuard,RolesGuard)
  @Get(':testId/results')
  async getResults(@Param('testId') testId: number) {
    return this.testService.getTestResults(testId);
  }
}
