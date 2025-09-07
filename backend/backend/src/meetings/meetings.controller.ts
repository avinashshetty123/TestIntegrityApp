import { Body, Controller, Get, Param, Post, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { LivekitService } from '../livekit/livekit.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { JoinMeetingDto } from './dto/join-meeting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from 'src/user/entities/user.entity';

@Controller('meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeetingsController {
  constructor(
    private readonly meetings: MeetingsService,
    private readonly livekit: LivekitService,
  ) {}

  @Post('/create')
  @Roles(UserRole.TUTOR)
  async create(@Body() dto: CreateMeetingDto, @Req() req) {
    return this.meetings.create(dto, req.user.userId);
  }

  @Post(':id/start')
  @Roles(UserRole.TUTOR)
  async start(@Param('id') id: string, @Req() req) {
    const meeting = await this.meetings.start(id, req.user.userId);
    const token = await this.livekit.createToken({
      roomName: meeting.roomName,
      identity: req.user.userId,
      displayName: req.user.email,
      isTeacher: true,
    });
    console.log(token);
    return { meeting, token, serverUrl: process.env.LIVEKIT_SERVER_URL };
  }

  @Post(':id/join')
  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  async join(@Param('id') id: string, @Body() dto: JoinMeetingDto, @Req() req) {
    const meeting = await this.meetings.findById(id);
    if (meeting.status !== 'LIVE') throw new ForbiddenException('Meeting not live yet');

    const token = await this.livekit.createToken({
      roomName: meeting.roomName,
      identity: req.user.userId,
      displayName: dto.displayName || req.user.email,
      isTeacher: req.user.role === UserRole.TUTOR,
    });

    return { meeting, token, serverUrl: process.env.LIVEKIT_SERVER_URL };
  }

  @Post(':id/end')
  @Roles(UserRole.TUTOR)
  async end(@Param('id') id: string, @Req() req) {
    return this.meetings.end(id, req.user.id);
  }

  @Get('/visible')
  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  async visible() {
    return this.meetings.findVisible();
  }
}
