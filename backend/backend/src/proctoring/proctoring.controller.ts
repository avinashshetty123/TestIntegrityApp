import { Controller, Post, Get, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
import { ProctoringService } from './proctoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../user/entities/user.entity';

@Controller('proctoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProctoringController {
  constructor(private readonly proctoringService: ProctoringService) {}

  // ===== SESSION MANAGEMENT =====
  @Post('session/start')
  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  async startSession(@Body() data: { meetingId: string; userId: string; participantId: string }) {
    return this.proctoringService.startProctoringSession(data.meetingId, data.userId, data.participantId);
  }

  @Post('session/end')
  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  async endSession(@Body() data: { meetingId: string; participantId: string }) {
    return this.proctoringService.endProctoringSession(data.meetingId, data.participantId);
  }

  // ===== REAL-TIME ANALYSIS =====
  @Post('analyze-frame')
  @Roles(UserRole.STUDENT)
  async analyzeFrame(@Body() frameData: { 
    meetingId: string; 
    userId: string; 
    participantId: string; 
    detections?: {
      faceCount?: number;
      phoneDetected?: boolean;
      phoneConfidence?: number;
      objects?: string[];
    };
    browserData?: any;
  }) {
    return this.proctoringService.analyzeFrame(frameData);
  }

  @Post('browser-activity')
  @Roles(UserRole.STUDENT)
  async recordBrowserActivity(@Body() data: { 
    meetingId: string; 
    userId: string; 
    participantId: string; 
    activityType: any; 
    metadata?: any 
  },@Req() req) {


    return this.proctoringService.recordBrowserActivity(data);
  }

  // ===== ALERTS & MONITORING =====
  @Get('alerts/:meetingId')
  @Roles(UserRole.TUTOR)
  async getAlerts(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getSessionAlerts(meetingId);
  }

  @Get('alerts/:meetingId/:participantId')
  @Roles(UserRole.TUTOR)
  async getParticipantAlerts(
    @Param('meetingId') meetingId: string,
    @Param('participantId') participantId: string
  ) {
    return this.proctoringService.getSessionAlerts(meetingId, participantId);
  }

  @Get('alerts-summary/:meetingId')
  @Roles(UserRole.TUTOR)
  async getAlertSummary(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getAlertSummary(meetingId);
  }

  // ===== FLAGS & RISK ASSESSMENT =====
  @Get('flags/:meetingId')
  @Roles(UserRole.TUTOR)
  async getAllStudentFlags(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getMeetingFlags(meetingId);
  }

  @Get('flags/:meetingId/:userId')
  @Roles(UserRole.TUTOR)
  async getStudentFlags(
    @Param('meetingId') meetingId: string,
    @Param('userId') userId: string
  ) {
    return this.proctoringService.getStudentFlags(meetingId, userId);
  }

  // ===== COMPREHENSIVE REPORTS =====
  @Get('report/:meetingId')
  @Roles(UserRole.TUTOR)
  async generateReport(@Param('meetingId') meetingId: string) {
    return this.proctoringService.generateProctoringReport(meetingId);
  }

  @Get('detailed-report/:meetingId')
  @Roles(UserRole.TUTOR)
  async generateDetailedReport(@Param('meetingId') meetingId: string) {
    return this.proctoringService.generateDetailedProctoringReport(meetingId);
  }

  @Get('participant-report/:meetingId/:userId')
  @Roles(UserRole.TUTOR)
  async getParticipantReport(
    @Param('meetingId') meetingId: string,
    @Param('userId') userId: string
  ) {
    return this.proctoringService.generateParticipantReport(meetingId, userId);
  }

  // ===== STATISTICS & ANALYTICS =====
  @Get('statistics/:meetingId')
  @Roles(UserRole.TUTOR)
  async getMeetingStatistics(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getMeetingStatistics(meetingId);
  }

  @Get('risk-analysis/:meetingId')
  @Roles(UserRole.TUTOR)
  async getRiskAnalysis(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getRiskAnalysis(meetingId);
  }

  // ===== REAL-TIME DASHBOARD DATA =====
  @Get('dashboard/:meetingId')
  @Roles(UserRole.TUTOR)
  async getDashboardData(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getDashboardData(meetingId);
  }

  @Get('live-alerts/:meetingId')
  @Roles(UserRole.TUTOR)
  async getLiveAlerts(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getLiveAlerts(meetingId);
  }
}