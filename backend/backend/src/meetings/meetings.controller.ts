import { Body, Controller, Get, Param, Post, Delete, UseGuards, Req, ForbiddenException, Put, Logger, Inject, Res } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { LivekitService } from '../livekit/livekit.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { JoinMeetingDto } from './dto/join-meeting.dto';
import { UpdateMeetingSessionDto } from './dto/meeting-session.dto';
import { KickParticipantDto } from './dto/kick-participant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from 'src/user/entities/user.entity';
import { MeetingParticipantService } from './meeting-participant.service';
import { ProctoringService } from '../proctoring/proctoring.service';
import { MeetingGateway } from './meeting.gateway';
type StatusType = 'APPROVED' | 'REJECTED';
enum JoinStatusEnum {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
interface JoinRequestResponseDto {
  status: JoinStatusEnum;}
@Controller('meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeetingsController {
  private readonly logger = new Logger(MeetingsController.name);

  constructor(
    private readonly meetings: MeetingsService,
    private readonly livekit: LivekitService,
    @Inject(MeetingParticipantService)
    private readonly participantService: MeetingParticipantService,
    @Inject(ProctoringService)
    private readonly proctoringService: ProctoringService,
     private readonly meetingGateway: MeetingGateway,
  ) {}

  @Post('/create')
  @Roles(UserRole.TUTOR)
  async create(@Body() dto: CreateMeetingDto, @Req() req) {
    this.logger.log(`Tutor ${req.user.userId} creating meeting: ${dto.title}`);
    const meeting = await this.meetings.create(dto, req.user.userId);
    this.logger.log(`Meeting created with ID: ${meeting.id}`);
    return meeting;
  }
// In your controller methods where you want fresh data
@Get(':id/join-requests')
@Roles(UserRole.TUTOR)
async getJoinRequests(@Param('id') id: string, @Req() req) {
  // Disable caching for real-time data

  
  const meeting = await this.meetings.findById(id);
  if (meeting.teacherId !== req.user.userId) {
    throw new ForbiddenException('Not your meeting');
  }
  return this.meetings.getPendingJoinRequests(id);
}

  @Post(':id/start')
  @Roles(UserRole.TUTOR)
  async start(@Param('id') id: string, @Req() req) {
    this.logger.log(`Tutor ${req.user.userId} starting meeting: ${id}`);
    const meeting = await this.meetings.start(id, req.user.userId);
    
    const token = await this.livekit.createToken({
      roomName: meeting.roomName,
      identity: req.user.userId,
      displayName: req.user.email,
      isTeacher: true,
    });
    
    const serverUrl = process.env.LIVEKIT_CLIENT_URL || 'ws://localhost:7880';
    this.logger.log(`Meeting ${id} started successfully, room: ${meeting.roomName}`);
    return { meeting, token, serverUrl };
  }

  @Post(':id/join')
  async join(@Param('id') id: string, @Body() dto: JoinMeetingDto, @Req() req) {
    this.logger.log(`User ${req.user.userId} attempting to join meeting: ${id}`);
    
    let meeting = await this.meetings.findById(id);
    if (!meeting) {
      this.logger.error(`Meeting ${id} not found`);
      throw new ForbiddenException('Meeting not found');
    }

    // Check if meeting is locked and user is not the teacher
    
    // Check approval for students
    if (req.user.role === UserRole.STUDENT && meeting.requireApproval) {
      const canJoin = await this.meetings.canStudentJoin(id, req.user.userId);
      if (!canJoin) {
        this.logger.warn(`Student ${req.user.userId} join request pending for meeting ${id}`);
        throw new ForbiddenException('Join request pending approval');
      }
    }
    
    // Auto-start meeting if scheduled
    if (meeting.status === 'SCHEDULED') {
      meeting = await this.meetings.start(id, meeting.teacherId);
    }
    
    const user = await this.meetings.userservice.findById(req.user.userId);
    await this.meetings.createSession({
      meetingId: meeting.id,
      participantId: req.user.userId,
      participantName: user?.fullName || dto.displayName || req.user.email,
      participantType: req.user.role === UserRole.TUTOR ? 'tutor' : 'student'
    });
    
    // Create participant record
    await this.participantService.joinMeeting(meeting.id, req.user.userId);
    
    const token = await this.livekit.createToken({
      roomName: meeting.roomName,
      identity: req.user.userId,
      displayName: user?.fullName || dto.displayName || req.user.email,
      isTeacher: req.user.role === UserRole.TUTOR,
    });
    
    const serverUrl = process.env.LIVEKIT_CLIENT_URL || 'ws://localhost:7880';
    this.logger.log(`User ${req.user.userId} successfully joined meeting ${id}`);

    return { meeting, token, serverUrl };
  }

  @Post(':id/end')
  @Roles(UserRole.TUTOR)
  async end(@Param('id') id: string, @Req() req) {
    this.logger.log(`Tutor ${req.user.userId} ending meeting: ${id}`);
    const result = await this.meetings.end(id, req.user.userId);
    this.logger.log(`Meeting ${id} ended successfully`);
    return result;
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
    this.logger.log(`Student ${req.user.userId} joining by code: ${body.joinCode}`);
    
    const meeting = await this.meetings.findByJoinCode(body.joinCode);
    if (!meeting) {
      throw new ForbiddenException('Invalid join code');
    }

    // Check if student needs approval
    if (meeting.requireApproval) {
      const canJoin = await this.meetings.canStudentJoin(meeting.id, req.user.userId);
      if (!canJoin) {
        throw new ForbiddenException('Join request pending approval');
      }
    }
    
    // Auto-start meeting if it's scheduled
    let activeMeeting = meeting;
    if (meeting.status === 'SCHEDULED') {
      activeMeeting = await this.meetings.start(meeting.id, meeting.teacherId);
    }

    // Create participant record
    await this.participantService.joinMeeting(activeMeeting.id, req.user.userId);

    const token = await this.livekit.createToken({
      roomName: activeMeeting.roomName,
      identity: req.user.userId,
      displayName: body.displayName || req.user.email,
      isTeacher: false,
    });
    
    const serverUrl = process.env.LIVEKIT_CLIENT_URL || 'ws://localhost:7880';
    this.logger.log(`Student ${req.user.userId} joined meeting ${meeting.id} by code`);
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

  @Post(':id/join-request')
  @Roles(UserRole.STUDENT)
  async createJoinRequest(@Param('id') id: string, @Req() req) {
    this.logger.log(`Student ${req.user.userId} requesting to join meeting: ${id}`);
    const user = await this.meetings.userservice.findById(req.user.userId);
    const request = await this.meetings.createJoinRequest(id, req.user.userId, user?.fullName || req.user.email);
    this.logger.log(`Join request created for student ${req.user.userId} in meeting ${id}`);
    return request;
  }


 @Put('join-request/:requestId')
@Roles(UserRole.TUTOR)
async respondToJoinRequest(@Param('requestId') requestId: string, @Body() body: JoinRequestResponseDto, @Req() req) {
  this.logger.log(`Tutor ${req.user.userId} responding to join request ${requestId}: ${body.status}`);

  const response = await this.meetings.respondToJoinRequest(requestId, body.status);

  if (body.status === JoinStatusEnum.APPROVED) {
    // Fix: Use the correct method name and parameters
    this.meetingGateway.notifyStudentApproval(response.studentId, response.meetingId);
  }

  this.logger.log(`Join request ${requestId} ${body.status.toLowerCase()}`);
  return response;
}

  @Post(':id/kick-participant')
  @Roles(UserRole.TUTOR)
  async kickParticipant(@Param('id') meetingId: string, @Body() body: { studentId: string }, @Req() req) {
    this.logger.log(`Tutor ${req.user.userId} kicking participant ${body.studentId} from meeting ${meetingId}`);
    
    const meeting = await this.meetings.findById(meetingId);
    const kickDto: KickParticipantDto = {
      meetingId,
      tutorId: req.user.userId,
      studentId: body.studentId
    };
    
    const result = await this.meetings.kickParticipant(kickDto);
    
    // Disconnect from LiveKit room
    try {
      await this.livekit.disconnectParticipant(meeting.roomName, body.studentId);
      this.logger.log(`Participant ${body.studentId} disconnected from LiveKit room ${meeting.roomName}`);
    } catch (error) {
      this.logger.error(`Failed to disconnect participant from LiveKit: ${error.message}`);
    }
    
    this.logger.log(`Participant ${body.studentId} kicked from meeting ${meetingId}`);
    return result;
  }

  @Put(':id/lock')
  @Roles(UserRole.TUTOR)
  async lockMeeting(@Param('id') id: string, @Req() req) {
    const meeting = await this.meetings.findById(id);
    if (meeting.teacherId !== req.user.userId) {
      throw new ForbiddenException('Not your meeting');
    }

    this.logger.log(`Tutor ${req.user.userId} locking meeting: ${id}`);
    const lockedMeeting = await this.meetings.lockMeeting(meeting.id);
    this.logger.log(`Meeting ${id} locked successfully`);
    return lockedMeeting;
  }

  @Put(':id/unlock')
  @Roles(UserRole.TUTOR)
  async unlockMeeting(@Param('id') id: string, @Req() req) {
    const meeting = await this.meetings.findById(id);
    if (meeting.teacherId !== req.user.userId) {
      throw new ForbiddenException('Not your meeting');
    }

    this.logger.log(`Tutor ${req.user.userId} unlocking meeting: ${id}`);
    const unlockedMeeting = await this.meetings.unlockMeeting(meeting.id);
    this.logger.log(`Meeting ${id} unlocked successfully`);
    return unlockedMeeting;
  }

  @Put('session/:sessionId')
  async updateSession(@Param('sessionId') sessionId: string, @Body() dto: UpdateMeetingSessionDto) {
    return this.meetings.updateSession(sessionId, dto);
  }

  @Get(':id/complete-report')
  @Roles(UserRole.TUTOR)
  async getCompleteReport(@Param('id') meetingId: string, @Req() req) {
    const meeting = await this.meetings.findById(meetingId);
    if (meeting.teacherId !== req.user.userId) {
      throw new ForbiddenException('Not your meeting');
    }

    const [participants, proctoringReport] = await Promise.all([
      this.participantService.getParticipantSummary(meetingId),
      this.proctoringService.generateProctoringReport(meetingId),
    ]);

    return {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        status: meeting.status,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
        teacher: {
          id: meeting.teacher.id,
          name: meeting.teacher.fullName,
          email: meeting.teacher.email,
        },
      },
      participants,
      proctoring: proctoringReport,
      summary: {
        totalStudents: participants.total,
        studentsJoined: participants.joined,
        totalAlerts: proctoringReport.totalAlerts,
        highRiskStudents: proctoringReport.overallSummary.highRiskParticipants,
        averageRiskScore: proctoringReport.overallSummary.averageRiskScore,
        mostCommonViolation: proctoringReport.overallSummary.mostCommonAlert,
      },
    };
  }

  @Get(':id/students')
  @Roles(UserRole.TUTOR)
  async getMeetingStudents(@Param('id') meetingId: string, @Req() req) {
    const meeting = await this.meetings.findById(meetingId);
    if (meeting.teacherId !== req.user.userId) {
      throw new ForbiddenException('Not your meeting');
    }

    const participants = await this.participantService.getMeetingParticipants(meetingId);
    const alerts = await this.proctoringService.getSessionAlerts(meetingId);
    
    return participants.map(participant => {
      const studentAlerts = alerts.filter(alert => alert.userId === participant.userId);
      
      return {
        userId: participant.userId,
        name: participant.user.fullName,
        email: participant.user.email,
        status: participant.status,
        joinedAt: participant.joinedAt,
        leftAt: participant.leftAt,
        duration: participant.totalDuration,
        alertCount: studentAlerts.length,
        riskLevel: this.calculateRiskLevel(studentAlerts.length),
        lastAlert: studentAlerts[0]?.detectedAt || null,
      };
    });
  }

  @Get(':id/participants')
  @Roles(UserRole.TUTOR)
  async getMeetingParticipants(@Param('id') meetingId: string, @Req() req) {
    const meeting = await this.meetings.findById(meetingId);
    if (meeting.teacherId !== req.user.userId) {
      throw new ForbiddenException('Not your meeting');
    }
    return this.participantService.getMeetingParticipants(meetingId);
  }

  @Get(':id/alerts-detailed')
  @Roles(UserRole.TUTOR)
  async getMeetingAlertsDetailed(@Param('id') meetingId: string, @Req() req) {
    const meeting = await this.meetings.findById(meetingId);
    if (meeting.teacherId !== req.user.userId) {
      throw new ForbiddenException('Not your meeting');
    }
    return this.proctoringService.getAlertsWithParticipantDetails(meetingId);
  }

  @Get(':id/monitoring-dashboard')
  @Roles(UserRole.TUTOR)
  async getMonitoringDashboard(@Param('id') meetingId: string, @Req() req) {
    const meeting = await this.meetings.findById(meetingId);
    if (meeting.teacherId !== req.user.userId) {
      throw new ForbiddenException('Not your meeting');
    }

    const [participants, alerts, alertSummary, liveAlerts] = await Promise.all([
      this.participantService.getMeetingParticipants(meetingId),
      this.proctoringService.getAlertsWithParticipantDetails(meetingId),
      this.proctoringService.getAlertSummary(meetingId),
      this.proctoringService.getLiveAlerts(meetingId)
    ]);

    // Calculate participant risk scores
    const participantRisks = participants.map(participant => {
      const participantAlerts = alerts.filter(alert => alert.participant.id === participant.userId);
      const riskScore = this.calculateParticipantRiskScore(participantAlerts);
      
      return {
        userId: participant.userId,
        name: participant.user.fullName,
        email: participant.user.email,
        status: participant.status,
        joinedAt: participant.joinedAt,
        alertCount: participantAlerts.length,
        riskScore,
        riskLevel: this.calculateRiskLevel(participantAlerts.length),
        lastAlert: participantAlerts[0]?.detectedAt || null,
        recentAlerts: participantAlerts.slice(0, 5) // Last 5 alerts
      };
    });

    return {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        status: meeting.status,
        startedAt: meeting.startedAt
      },
      participants: participantRisks,
      alerts: {
        total: alerts.length,
        recent: liveAlerts,
        summary: alertSummary,
        detailed: alerts.slice(0, 20) // Last 20 alerts
      },
      statistics: {
        totalParticipants: participants.length,
        activeParticipants: participants.filter(p => p.status === 'JOINED').length,
        highRiskParticipants: participantRisks.filter(p => p.riskLevel === 'HIGH').length,
        totalAlerts: alerts.length,
        recentAlerts: liveAlerts.length
      },
      lastUpdated: new Date()
    };
  }

  private calculateParticipantRiskScore(alerts: any[]): number {
    if (alerts.length === 0) return 0;
    
    const severityWeights = { 'LOW': 0.1, 'MEDIUM': 0.3, 'HIGH': 0.7, 'CRITICAL': 1.0 };
    const totalWeight = alerts.reduce((sum, alert) => {
      return sum + (severityWeights[alert.severity] || 0.3) * alert.confidence;
    }, 0);
    
    return Math.min(totalWeight / alerts.length, 1.0);
  }

  @Post(':id/participant-leave')
  async leaveParticipant(@Param('id') meetingId: string, @Body() data: { userId: string }) {
    return this.participantService.leaveMeeting(meetingId, data.userId);
  }

  private calculateRiskLevel(alertCount: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (alertCount === 0) return 'LOW';
    if (alertCount <= 3) return 'MEDIUM';
    return 'HIGH';
  }
  @Delete(":id")
  @Roles(UserRole.TUTOR)
  async deleteMeeting(@Param('id') id: string, @Req() req) {
    
    
    return this.meetings.delete(id,req.user.userId);
  }
}