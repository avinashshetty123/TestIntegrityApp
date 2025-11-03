import { Body, Controller, Get, Param, Post, Delete, UseGuards, Req, ForbiddenException, Put } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { LivekitService } from '../livekit/livekit.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { JoinMeetingDto } from './dto/join-meeting.dto';
import { CreateMeetingSessionDto, UpdateMeetingSessionDto, CreateLockRequestDto, RespondToLockRequestDto } from './dto/meeting-session.dto';
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

    if (meeting.isLocked && req.user?.userId !== meeting.teacherId) {
      throw new ForbiddenException('Meeting is locked');
    }
    
    // Auto-start meeting if it's scheduled
    if (meeting.status === 'SCHEDULED') {
      meeting = await this.meetings.start(id, meeting.teacherId);
    }

    // Create session
    const user = await this.meetings.userservice.findById(req.user?.userId);
    await this.meetings.createSession({
      meetingId: meeting.id,
      participantId: req.user?.userId || `user-${Date.now()}`,
      participantName: user?.fullName || dto.displayName || req.user?.email || 'User',
      participantType: req.user?.role === UserRole.TUTOR ? 'tutor' : 'student'
    });

    const token = await this.livekit.createToken({
      roomName: meeting.roomName,
      identity: req.user?.userId || `user-${Date.now()}`,
      displayName: user?.fullName || dto.displayName || req.user?.email || 'User',
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

  @Get(':id/results')
  @Roles(UserRole.TUTOR)
  async getResults(@Param('id') id: string, @Req() req) {
    const meeting = await this.meetings.findById(id);
    if (meeting.teacherId !== req.user.userId) {
      throw new ForbiddenException('Not your meeting');
    }
    return this.meetings.getMeetingResults(id);
  }

  @Get(':id/sessions')
  @Roles(UserRole.TUTOR)
  async getSessions(@Param('id') id: string, @Req() req) {
    const meeting = await this.meetings.findById(id);
    if (meeting.teacherId !== req.user.userId) {
      throw new ForbiddenException('Not your meeting');
    }
    return this.meetings.getActiveSessions(id);
  }

  @Post(':id/lock-request')
  @Roles(UserRole.STUDENT)
  async createLockRequest(@Param('id') id: string, @Body() dto: CreateLockRequestDto, @Req() req) {
    const user = await this.meetings.userservice.findById(req.user.userId);
    return this.meetings.createLockRequest({
      ...dto,
      meetingId: id,
      studentId: req.user.userId,
      studentName: user?.fullName || req.user.email
    });
  }

  @Get(':id/lock-requests')
  @Roles(UserRole.TUTOR)
  async getLockRequests(@Param('id') id: string, @Req() req) {
    const meeting = await this.meetings.findById(id);
    if (meeting.teacherId !== req.user.userId) {
      throw new ForbiddenException('Not your meeting');
    }
    return this.meetings.getPendingLockRequests(id);
  }

  @Put('lock-request/:requestId')
  @Roles(UserRole.TUTOR)
  async respondToLockRequest(@Param('requestId') requestId: string, @Body() dto: RespondToLockRequestDto) {
    return this.meetings.respondToLockRequest(requestId, dto);
  }

  @Put('session/:sessionId')
  async updateSession(@Param('sessionId') sessionId: string, @Body() dto: UpdateMeetingSessionDto) {
    return this.meetings.updateSession(sessionId, dto);
  }

  @Post(':id/publish')
  @Roles(UserRole.TUTOR)
  async publishMeeting(@Param('id') id: string, @Req() req) {
    return this.meetings.publishMeeting(id, req.user.userId);
  }

  @Post(':id/join-request')
  @Roles(UserRole.STUDENT)
  async createJoinRequest(@Param('id') id: string, @Req() req) {
    const user = await this.meetings.userservice.findById(req.user.userId);
    return this.meetings.createJoinRequest(id, req.user.userId, user?.fullName || req.user.email);
  }

  @Get(':id/join-requests')
  @Roles(UserRole.TUTOR)
  async getJoinRequests(@Param('id') id: string, @Req() req) {
    const meeting = await this.meetings.findById(id);
    if (meeting.teacherId !== req.user.userId) {
      throw new ForbiddenException('Not your meeting');
    }
    return this.meetings.getPendingJoinRequests(id);
  }

  @Put('join-request/:requestId')
  @Roles(UserRole.TUTOR)
  async respondToJoinRequest(@Param('requestId') requestId: string, @Body() body: { status: 'APPROVED' | 'REJECTED' }) {
    return this.meetings.respondToJoinRequest(requestId, body.status);
  }

  @Delete(':id')
  @Roles(UserRole.TUTOR)
  async delete(@Param('id') id: string, @Req() req) {
    return this.meetings.delete(id, req.user.userId);
  }
}
