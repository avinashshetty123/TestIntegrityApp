import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ProctoringService } from './proctoring.service';
import type { AnalyzeFrameDto } from './dto/analyze-frame.dto';

@Controller('proctoring')
export class ProctoringController {
  constructor(private readonly proctoringService: ProctoringService) {}

  @Post('analyze-frame')
  async analyzeFrame(@Body() data: AnalyzeFrameDto) {
    return this.proctoringService.analyzeFrame(data);
  }

  @Post('session/create')
  async createSession(@Body() data: {
    meetingId: string;
    participantId: string;
    userId: string;
    studentName?: string;
    startedAt: string;
  }) {
    return this.proctoringService.createSession(data);
  }

  @Get('session/:meetingId/participants')
  async getSessionParticipants(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getSessionParticipants(meetingId);
  }

  @Post('browser-activity')
  async reportBrowserActivity(@Body() data: {
    meetingId: string;
    userId: string;
    participantId: string;
    activityType: string;
    metadata?: any;
  }) {
    return this.proctoringService.analyzeFrame({
      meetingId: data.meetingId,
      userId: data.userId,
      participantId: data.participantId,
      detections: {
        suspiciousBehavior: true
      },
      browserData: {
        [data.activityType.toLowerCase()]: true
      }
    });
  }

  @Post('test-violation')
  async reportTestViolation(@Body() data: {
    testId: string;
    violationType: string;
    description: string;
    timestamp: string;
  }) {
    return this.proctoringService.recordTestViolation(data);
  }

  @Get('meeting/:meetingId/flags')
  async getMeetingFlags(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getMeetingFlags(meetingId);
  }

  @Get('test/:testId/flags')
  async getTestFlags(@Param('testId') testId: string) {
    return this.proctoringService.getTestFlags(testId);
  }

  @Get('session/:meetingId/alerts')
  async getSessionAlerts(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getSessionAlerts(meetingId);
  }

  @Get('session/:meetingId/participant/:participantId/alerts')
  async getParticipantAlerts(
    @Param('meetingId') meetingId: string,
    @Param('participantId') participantId: string
  ) {
    return this.proctoringService.getSessionAlerts(meetingId, participantId);
  }

  @Get('meeting/:meetingId/stats')
  async getMeetingStats(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getMeetingStats(meetingId);
  }

  @Get('detailed-report/:meetingId')
  async getDetailedReport(@Param('meetingId') meetingId: string) {
    return this.proctoringService.generateDetailedReport(meetingId);
  }

  @Get('report/:meetingId')
  async getReport(@Param('meetingId') meetingId: string) {
    return this.proctoringService.generateProctoringReport(meetingId);
  }

  @Get('alerts/:meetingId')
  async getAlerts(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getAlertsWithParticipantDetails(meetingId);
  }

  @Get('live-alerts/:meetingId')
  async getLiveAlerts(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getLiveAlerts(meetingId);
  }

  @Get('participant/:meetingId/:participantId')
  async getParticipantReport(
    @Param('meetingId') meetingId: string,
    @Param('participantId') participantId: string
  ) {
    return this.proctoringService.getParticipantDetailedReport(meetingId, participantId);
  }

  @Get('meeting/:meetingId/alerts-detailed')
  async getAlertsDetailed(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getAlertsWithParticipantDetails(meetingId);
  }
}