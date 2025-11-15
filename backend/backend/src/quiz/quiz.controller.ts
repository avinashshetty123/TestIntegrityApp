import { Controller, Get, Post, Body, Param, UseGuards, Req, ForbiddenException, Logger } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { ImportQuestionDto } from './dto/quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../user/entities/user.entity';
import { MeetingsService } from '../meetings/meetings.service';
import { QuizGateway } from './quiz.gateway';
import { Inject,forwardRef } from '@nestjs/common';
@Controller('quiz')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuizController {
  private readonly logger = new Logger(QuizController.name);

  constructor(
    private readonly quizService: QuizService,
    private readonly meetingsService: MeetingsService,
     @Inject(forwardRef(() => QuizGateway))
    private quizGateway: QuizGateway,
  ) {}


@Get(':meetingId/leaderboard')
@Roles(UserRole.TUTOR, UserRole.STUDENT)
async getMeetingLeaderboard(@Param('meetingId') meetingId: string) {
  return this.quizService.getMeetingLeaderboard(meetingId);
}



  @Get(':meetingId/active')
  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  async getActiveQuiz(@Param('meetingId') meetingId: string, @Req() req) {
    // Verify user is in meeting
    const meeting = await this.meetingsService.findById(meetingId);
    if (req.user.role === UserRole.TUTOR && meeting.teacherId !== req.user.userId) {
      throw new ForbiddenException('Not your meeting');
    }

    return this.quizService.getActiveQuiz(meetingId);
  }

  @Get('results/:quizId')
  @Roles(UserRole.TUTOR)
  async getQuizResults(@Param('quizId') quizId: string, @Req() req) {
    this.logger.log(`Tutor ${req.user.userId} getting results for quiz ${quizId}`);
    return this.quizService.getQuizResults(quizId);
  }

  @Get(':meetingid/quizes')
  @Roles(UserRole.TUTOR)
  async getQuizes(@Param('meetingid') meetingid: string, @Req() req) {
    this.logger.log(`Tutor ${req.user.userId} getting quizes for meeting ${meetingid}`);
    return this.quizService.getQuizes(meetingid);
  }

}