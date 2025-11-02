import { Body, Controller, Get, Param, Post, Delete, UseGuards, Req, ForbiddenException } from '@nestjs/common';
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
    const meeting = await this.meetings.start(id, req.user?.userId || 'test-user');
    const token = await this.livekit.createToken({
      roomName: meeting.roomName,
      identity: req.user?.userId || 'test-user',
      displayName: req.user?.email || 'Test User',
      isTeacher: true,
    });
    console.log(token);
    const serverUrl = process.env.LIVEKIT_CLIENT_URL || 'ws://localhost:7880';
    console.log(`[DEBUG] Returning serverUrl: ${serverUrl}`);
    return { meeting, token, serverUrl };
  }

  @Post(':id/join')
  async join(@Param('id') id: string, @Body() dto: JoinMeetingDto, @Req() req) {
    let meeting = await this.meetings.findById(id);
    
    if (!meeting) {
      throw new ForbiddenException('Meeting not found');
    }
    
    // Auto-start meeting if it's scheduled
    if (meeting.status === 'SCHEDULED') {
      meeting = await this.meetings.start(id, meeting.teacherId);
    }

    const token = await this.livekit.createToken({
      roomName: meeting.roomName,
      identity: req.user?.userId || `user-${Date.now()}`,
      displayName: dto.displayName || req.user?.email || 'User',
      isTeacher: req.user?.role === UserRole.TUTOR,
    });
    
    const serverUrl = process.env.LIVEKIT_CLIENT_URL || 'ws://localhost:7880';
    return { meeting, token, serverUrl };
  }

  @Post(':id/end')
  @Roles(UserRole.TUTOR)
  async end(@Param('id') id: string, @Req() req) {
    return this.meetings.end(id, req.user.id);
  }

  @Get('/visible')
  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  async visible(@Req() req) {
    const userRole = req.user?.role;
    if (userRole === UserRole.STUDENT) {
      const user = await this.meetings.userservice.findById(req.user.userId);
      return this.meetings.findVisibleForStudents(user?.institutionName);
    } else {
      return this.meetings.findByTutor(req.user.userId);
    }
  }

  @Get('/search/:query')
  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  async search(@Param('query') query: string, @Req() req) {
    const userRole = req.user?.role;
    return this.meetings.searchMeetings(query, userRole, req.user.userId);
  }

  @Get('/institution/:institution')
  @Roles(UserRole.STUDENT)
  async byInstitution(@Param('institution') institution: string) {
    return this.meetings.findByInstitution(institution);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  async findOne(@Param('id') id: string) {
    return this.meetings.findById(id);
  }

  @Post('join-by-code')
  @Roles(UserRole.STUDENT)
  async joinByCode(@Body() body: { joinCode: string, displayName?: string }, @Req() req) {
    const meeting = await this.meetings.findByJoinCode(body.joinCode);
    if (!meeting) {
      throw new ForbiddenException('Invalid join code');
    }
    
    // Auto-start meeting if it's scheduled
    let activeMeeting = meeting;
    if (meeting.status === 'SCHEDULED') {
      activeMeeting = await this.meetings.start(meeting.id, meeting.teacherId);
    }

    const token = await this.livekit.createToken({
      roomName: activeMeeting.roomName,
      identity: req.user?.userId || `user-${Date.now()}`,
      displayName: body.displayName || req.user?.email || 'Student',
      isTeacher: false,
    });
    
    const serverUrl = process.env.LIVEKIT_CLIENT_URL || 'ws://localhost:7880';
    return { meeting: activeMeeting, token, serverUrl };
  }

  @Delete(':id')
  @Roles(UserRole.TUTOR)
  async delete(@Param('id') id: string, @Req() req) {
    return this.meetings.delete(id, req.user.userId);
  }
}
