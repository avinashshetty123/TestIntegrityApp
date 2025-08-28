import { Controller, Post, Body, Get, Param, Req } from '@nestjs/common';
import { TestService } from './tests.service';

@Controller('tests')
export class TestController {
  constructor(private readonly testService: TestService) {}

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

  @Get(':testId/results')
  async getResults(@Param('testId') testId: number) {
    return this.testService.getTestResults(testId);
  }
}
