import { Injectable, BadRequestException, Logger, NotFoundException, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ProctoringAlert } from '../meetings/entities/proctoring-alert.entity';
import { MeetingSession } from '../meetings/entities/meeting-session.entity';
import { MeetingParticipant } from '../meetings/entities/meeting-participant.entity';
import { Meeting } from '../meetings/entity/meeting.entity';
import { User } from '../user/entities/user.entity';
import { LivekitService } from '../livekit/livekit.service';

export type AlertType =
  | 'FACE_NOT_DETECTED'
  | 'MULTIPLE_FACES'
  | 'PHONE_DETECTED'
  | 'TAB_SWITCH'
  | 'SUSPICIOUS_BEHAVIOR'
  | 'DEEPFAKE_DETECTED'
  | 'COPY_PASTE'
  | 'WINDOW_SWITCH'
  | 'UNAUTHORIZED_DEVICE'
  | 'NO_FACE'
  | 'VOICE_DETECTED'
  | 'BACKGROUND_NOISE'
  | 'EYE_GAZE_DEVIATION'
  | 'FACE_VERIFIED';

@Injectable()
export class ProctoringService {
  private readonly logger = new Logger(ProctoringService.name);
  private activeSessions = new Map<string, any>();

  constructor(
    @InjectRepository(ProctoringAlert)
    private readonly alertRepo: Repository<ProctoringAlert>,
    @InjectRepository(MeetingSession)
    private readonly sessionRepo: Repository<MeetingSession>,
    @InjectRepository(MeetingParticipant)
    private readonly participantRepo: Repository<MeetingParticipant>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly livekitService: LivekitService,
  ) {}

  // ===== SESSION MANAGEMENT =====
  async startProctoringSession(meetingId: string, userId: string, participantId: string) {
    let session = await this.sessionRepo.findOne({ where: { meetingId, participantId } });
    
    if (!session) {
      session = this.sessionRepo.create({
        meetingId,
        userId,
        participantId,
        participantName: 'Unknown',
        participantType: 'student',
        status: 'ACTIVE',
      });
      session = await this.sessionRepo.save(session);
    } else {
      await this.sessionRepo.update(session.id, { status: 'ACTIVE', userId });
    }
    
    this.activeSessions.set(`${meetingId}-${participantId}`, session);
    return session;
  }

  async endProctoringSession(meetingId: string, participantId: string) {
    const sessionKey = `${meetingId}-${participantId}`;
    const session = this.activeSessions.get(sessionKey);
    
    if (session) {
      await this.sessionRepo.update(session.id, {
        leftAt: new Date(),
        status: 'COMPLETED',
      });
      this.activeSessions.delete(sessionKey);
    }
  }

  // ===== FRAME ANALYSIS =====
  async analyzeFrame(frameData: {
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
    const alerts: {
      alertType: AlertType;
      description: string;
      confidence: number;
      metadata?: any;
    }[] = [];

    try {
      // Process frontend detections
      if (frameData.detections) {
        const { faceCount = 1, phoneDetected = false, phoneConfidence = 0 } = frameData.detections;
        
        if (faceCount === 0) {
          alerts.push({
            alertType: 'FACE_NOT_DETECTED',
            description: 'No face detected in frame',
            confidence: 0.9,
            metadata: frameData.detections,
          });
        }

        if (faceCount > 1) {
          alerts.push({
            alertType: 'MULTIPLE_FACES',
            description: `${faceCount} faces detected`,
            confidence: 0.85,
            metadata: frameData.detections,
          });
        }

        if (phoneDetected) {
          alerts.push({
            alertType: 'PHONE_DETECTED',
            description: 'Mobile device detected',
            confidence: phoneConfidence,
            metadata: frameData.detections,
          });
        }
      }

      // Process browser behavior
      if (frameData.browserData) {
        const browserAlerts = this.analyzeBrowserBehavior(frameData.browserData);
        alerts.push(...browserAlerts);
      }

      // Save and notify
      for (const alert of alerts) {
        await this.saveAlert(frameData, alert);
        await this.updateSessionFlags(frameData.meetingId, frameData.participantId, alert);
        await this.sendRealTimeAlert(frameData.meetingId, frameData.participantId, alert);
      }

      await this.updateSessionStats(frameData.meetingId, frameData.participantId, alerts);

      return {
        alerts: alerts.length,
        details: alerts,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Frame analysis failed:', error);
      throw new BadRequestException('Frame analysis failed');
    }
  }

  private analyzeBrowserBehavior(browserData: any): any[] {
    const alerts: any[] = [];
    
    if (browserData.tabSwitched) {
      alerts.push({
        alertType: 'TAB_SWITCH',
        description: 'Tab switch detected',
        confidence: 0.9,
        metadata: browserData,
      });
    }
    
    if (browserData.copyPaste) {
      alerts.push({
        alertType: 'COPY_PASTE',
        description: 'Copy/paste activity detected',
        confidence: 0.85,
        metadata: browserData,
      });
    }
    
    if (browserData.windowSwitch) {
      alerts.push({
        alertType: 'WINDOW_SWITCH',
        description: 'Window switch detected',
        confidence: 0.9,
        metadata: browserData,
      });
    }
    
    return alerts;
  }

  private async saveAlert(frameData: any, alert: any): Promise<ProctoringAlert> {
    const entity = this.alertRepo.create({
      meetingId: frameData.meetingId,
      userId: frameData.userId,
      participantId: frameData.participantId,
      alertType: alert.alertType,
      description: alert.description,
      confidence: alert.confidence,
      metadata: alert.metadata,
      detectedAt: new Date(),
    });
    
    return this.alertRepo.save(entity);
  }

  // private async sendRealTimeAlert(meetingId: string, participantId: string, alert: any): Promise<void> {
  //   try {
  //     const alertData = {
  //       participantId,
  //       alertType: alert.alertType,
  //       description: alert.description,
  //       confidence: alert.confidence,
  //       severity: this.getAlertSeverity(alert.alertType),
  //       meetingId,
  //     };
      
  //     await this.livekitService.broadcastProctoringAlert(meetingId, alertData);
  //     this.logger.log(`Real-time alert sent for ${participantId}: ${alert.alertType}`);
  //   } catch (error) {
  //     this.logger.error('Failed to send real-time alert:', error);
  //   }
  // }

  private getAlertSeverity(alertType: AlertType): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const severityMap: Record<AlertType, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
      'FACE_NOT_DETECTED': 'MEDIUM',
      'MULTIPLE_FACES': 'HIGH',
      'PHONE_DETECTED': 'HIGH',
      'TAB_SWITCH': 'MEDIUM',
      'SUSPICIOUS_BEHAVIOR': 'MEDIUM',
      'DEEPFAKE_DETECTED': 'CRITICAL',
      'COPY_PASTE': 'HIGH',
      'WINDOW_SWITCH': 'MEDIUM',
      'UNAUTHORIZED_DEVICE': 'HIGH',
      'NO_FACE': 'MEDIUM',
      'VOICE_DETECTED': 'LOW',
      'BACKGROUND_NOISE': 'LOW',
      'EYE_GAZE_DEVIATION': 'MEDIUM',
      'FACE_VERIFIED': 'LOW',
    };
    
    return severityMap[alertType] || 'LOW';
  }

  private async updateSessionStats(meetingId: string, participantId: string, alerts: any[]): Promise<void> {
    const sessionKey = `${meetingId}-${participantId}`;
    const session = this.activeSessions.get(sessionKey);
    
    if (session) {
      const alertCounts = alerts.reduce((acc, alert) => {
        acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      await this.sessionRepo.update(session.id, {
        totalAlerts: (session.totalAlerts || 0) + alerts.length,
        alertBreakdown: { ...session.alertBreakdown, ...alertCounts },
        lastActivity: new Date(),
      });
    }
  }

async recordBrowserActivity(data: {
  meetingId: string;
  userId: string;
  participantId: string;
  activityType: 'TAB_SWITCH' | 'COPY_PASTE' | 'WINDOW_SWITCH' | 'BLUR' | 'FOCUS';
  metadata?: any;
},userId:string) {
  // Add validation
  if (!data.participantId) {
    this.logger.warn(`Missing participantId for browser activity in meeting ${data.meetingId}`);
    
    // Option A: Try to find participantId from active session
    const session = await this.sessionRepo.findOne({ 
      where: { meetingId: data.meetingId, userId: data.userId } 
    });
    
    if (session) {
      data.participantId = session.participantId;
    } else {
      // Option B: Generate a fallback or throw error
     data.participantId=userId;
    }
  }

  if (['TAB_SWITCH', 'COPY_PASTE', 'WINDOW_SWITCH'].includes(data.activityType)) {
    const alert = {
      alertType: data.activityType as AlertType,
      description: `Browser activity: ${data.activityType}`,
      confidence: 0.9,
      metadata: data.metadata,
    };
    
    await this.saveAlert({
      meetingId: data.meetingId,
      userId: data.userId,
      participantId: data.participantId,  // Now guaranteed to have value
    }, alert);
    
    await this.updateSessionFlags(data.meetingId, data.participantId, alert);
    await this.sendRealTimeAlert(data.meetingId, data.participantId, alert);
  }
}

  async updateSessionFlags(meetingId: string, participantId: string, alert: any): Promise<void> {
    const sessionKey = `${meetingId}-${participantId}`;
    let session = this.activeSessions.get(sessionKey);
    
    if (!session) {
      session = await this.sessionRepo.findOne({ where: { meetingId, participantId } });
    }
    
    if (session) {
      const severity = this.getAlertSeverity(alert.alertType);
      const updates: any = {
        flagCount: (session.flagCount || 0) + 1,
        lastFlagAt: new Date(),
        flagged: true,
      };
      
      if (severity === 'CRITICAL') updates.criticalFlags = (session.criticalFlags || 0) + 1;
      else if (severity === 'HIGH') updates.highFlags = (session.highFlags || 0) + 1;
      else if (severity === 'MEDIUM') updates.mediumFlags = (session.mediumFlags || 0) + 1;
      
      const alertBreakdown = session.alertBreakdown || {};
      alertBreakdown[alert.alertType] = (alertBreakdown[alert.alertType] || 0) + 1;
      updates.alertBreakdown = alertBreakdown;
      
      await this.sessionRepo.update(session.id, updates);
      Object.assign(session, updates);
    }
  }

  // ===== ALERTS & MONITORING =====
  async getSessionAlerts(meetingId: string, participantId?: string) {
    const where: Record<string, any> = { meetingId };
    if (participantId) where.participantId = participantId;

    return this.alertRepo.find({
      where,
      order: { detectedAt: 'DESC' },
    });
  }

  async getAlertSummary(meetingId: string) {
    const alerts = await this.alertRepo.find({ where: { meetingId } });

    const summary = {
      totalAlerts: alerts.length,
      byType: {} as Record<AlertType, number>,
      byParticipant: {} as Record<string, number>,
      timeline: [] as any[],
    };

    alerts.forEach((alert) => {
      summary.byType[alert.alertType] = (summary.byType[alert.alertType] || 0) + 1;
      summary.byParticipant[alert.participantId] =
        (summary.byParticipant[alert.participantId] || 0) + 1;
      
      summary.timeline.push({
        time: alert.detectedAt,
        type: alert.alertType,
        participant: alert.participantId,
        confidence: alert.confidence,
      });
    });

    return summary;
  }

  // ===== FLAGS & RISK ASSESSMENT =====
  async getMeetingFlags(meetingId: string) {
    return this.sessionRepo.find({ 
      where: { meetingId }, 
      relations: ['user'],
      select: ['id', 'userId', 'participantId', 'flagCount', 'criticalFlags', 'highFlags', 'mediumFlags', 'lastFlagAt']
    });
  }

  async getStudentFlags(meetingId: string, userId: string) {
    const session = await this.sessionRepo.findOne({ 
      where: { meetingId, userId }, 
      relations: ['user']
    });
    
    if (!session) {
      return { flagCount: 0, criticalFlags: 0, highFlags: 0, mediumFlags: 0, lastFlagAt: null };
    }
    
    return {
      userId: session.userId,
      studentName: session.user?.fullName,
      flagCount: session.flagCount || 0,
      criticalFlags: session.criticalFlags || 0,
      highFlags: session.highFlags || 0,
      mediumFlags: session.mediumFlags || 0,
      lastFlagAt: session.lastFlagAt,
      alertBreakdown: session.alertBreakdown || {},
    };
  }

  // ===== COMPREHENSIVE REPORTS =====
  async generateProctoringReport(meetingId: string) {
    const [alerts, sessions] = await Promise.all([
      this.alertRepo.find({ 
        where: { meetingId }, 
        relations: ['user'],
        order: { detectedAt: 'ASC' } 
      }),
      this.sessionRepo.find({ 
        where: { meetingId },
        relations: ['user']
      }),
    ]);

    const participantReports = sessions.map(session => {
      const participantAlerts = alerts.filter(a => a.userId === session.userId);
      
      return {
        userId: session.userId,
        participantId: session.participantId,
        studentInfo: {
          name: session.user?.fullName,
          email: session.user?.email,
          id: session.user?.id,
        },
        sessionDuration: session.endedAt ? 
          (session.endedAt.getTime() - session.joinedAt.getTime()) / 1000 / 60 : null,
        totalAlerts: participantAlerts.length,
        alertsByType: participantAlerts.reduce((acc, alert) => {
          acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        riskScore: this.calculateRiskScore(participantAlerts),
        timeline: participantAlerts.map(alert => ({
          time: alert.detectedAt,
          type: alert.alertType,
          description: alert.description,
          confidence: alert.confidence,
        })),
      };
    });

    return {
      meetingId,
      generatedAt: new Date(),
      totalParticipants: sessions.length,
      totalAlerts: alerts.length,
      participantReports,
      overallSummary: {
        highRiskParticipants: participantReports.filter(p => p.riskScore > 0.7).length,
        mostCommonAlert: this.getMostCommonAlert(alerts),
        averageRiskScore: participantReports.length > 0 
          ? participantReports.reduce((sum, p) => sum + p.riskScore, 0) / participantReports.length 
          : 0,
      },
    };
  }

  async generateDetailedProctoringReport(meetingId: string) {
    const [meeting, proctoringReport, participants] = await Promise.all([
      this.meetingRepo.findOne({ 
        where: { id: meetingId },
        relations: ['teacher']
      }),
      this.generateProctoringReport(meetingId),
      this.participantRepo.find({
        where: { meetingId },
        relations: ['user']
      })
    ]);

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // Calculate participant statistics
    const participantStats = participants.map(participant => {
      const participantAlerts = proctoringReport.participantReports.find(
        report => report.userId === participant.userId
      );

      return {
        userId: participant.userId,
        name: participant.user?.fullName || 'Unknown',
        email: participant.user?.email || 'Unknown',
        status: participant.status,
        joinedAt: participant.joinedAt,
        leftAt: participant.leftAt,
        duration: participant.totalDuration,
        alertCount: participantAlerts?.totalAlerts || 0,
        riskLevel: this.determineRiskLevel(participantAlerts?.riskScore || 0),
        riskScore: participantAlerts?.riskScore || 0,
        lastAlert: participantAlerts?.timeline[0]?.time || null
      };
    });

    const summary = {
      totalStudents: participants.length,
      studentsJoined: participants.filter(p => p.status === 'JOINED').length,
      totalAlerts: proctoringReport.totalAlerts,
      highRiskStudents: participantStats.filter(p => p.riskLevel === 'HIGH').length,
      averageRiskScore: participantStats.length > 0 
        ? participantStats.reduce((sum, p) => sum + p.riskScore, 0) / participantStats.length 
        : 0,
      mostCommonViolation: proctoringReport.overallSummary.mostCommonAlert,
    };

    return {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        scheduledAt: meeting.scheduledAt,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
        status: meeting.status,
        subject: meeting.subject,
        teacher: {
          id: meeting.teacher.id,
          fullName: meeting.teacher.fullName,
          email: meeting.teacher.email,
        },
      },
      participants: {
        total: participants.length,
        joined: participants.filter(p => p.status === 'JOINED').length,
        left: participants.filter(p => p.status === 'LEFT').length,
        participants: participantStats,
      },
      proctoring: proctoringReport,
      summary,
    };
  }

  async generateParticipantReport(meetingId: string, userId: string) {
    const [participant, alerts, session] = await Promise.all([
      this.participantRepo.findOne({
        where: { meetingId, userId },
        relations: ['user']
      }),
      this.alertRepo.find({
        where: { meetingId, userId },
        order: { detectedAt: 'DESC' }
      }),
      this.sessionRepo.findOne({
        where: { meetingId, userId }
      })
    ]);

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    const alertsByType = alerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const riskScore = this.calculateRiskScore(alerts);
    const riskLevel = this.determineRiskLevel(riskScore);

    const timeline = alerts.map(alert => ({
      time: alert.detectedAt,
      type: alert.alertType,
      description: alert.description,
      confidence: alert.confidence,
      severity: this.getAlertSeverity(alert.alertType),
    }));

    return {
      participant: {
        userId: participant.userId,
        name: participant.user?.fullName,
        email: participant.user?.email,
        status: participant.status,
        joinedAt: participant.joinedAt,
        leftAt: participant.leftAt,
        duration: participant.totalDuration,
      },
      proctoring: {
        totalAlerts: alerts.length,
        riskScore,
        riskLevel,
        alertsByType,
        timeline,
        sessionStats: {
          flagCount: session?.flagCount || 0,
          criticalFlags: session?.criticalFlags || 0,
          highFlags: session?.highFlags || 0,
          mediumFlags: session?.mediumFlags || 0,
        }
      },
      recommendations: this.generateRecommendations(alerts, riskLevel),
    };
  }

  // ===== STATISTICS & ANALYTICS =====
  async getMeetingStatistics(meetingId: string) {
    const [alerts, participants, sessions] = await Promise.all([
      this.alertRepo.find({ where: { meetingId } }),
      this.participantRepo.find({ where: { meetingId } }),
      this.sessionRepo.find({ where: { meetingId } }),
    ]);

    // Alert statistics by hour
    const alertsByHour = this.groupAlertsByHour(alerts);
    
    // Risk distribution
    const riskDistribution = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    sessions.forEach(session => {
      const sessionAlerts = alerts.filter(a => a.participantId === session.participantId);
      const riskScore = this.calculateRiskScore(sessionAlerts);
      const riskLevel = this.determineRiskLevel(riskScore);
      riskDistribution[riskLevel]++;
    });

    // Most common alert types
    const alertTypeDistribution = alerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalParticipants: participants.length,
      totalAlerts: alerts.length,
      averageAlertsPerParticipant: participants.length > 0 ? alerts.length / participants.length : 0,
      riskDistribution,
      alertTypeDistribution,
      alertsByHour,
      participationRate: participants.length > 0 
        ? (participants.filter(p => p.status === 'JOINED').length / participants.length) * 100 
        : 0,
      averageSessionDuration: this.calculateAverageDuration(sessions),
    };
  }

  async getRiskAnalysis(meetingId: string) {
    const [alerts, sessions] = await Promise.all([
      this.alertRepo.find({ 
        where: { meetingId },
        relations: ['user']
      }),
      this.sessionRepo.find({ 
        where: { meetingId },
        relations: ['user']
      }),
    ]);

    const riskAnalysis = sessions.map(session => {
      const sessionAlerts = alerts.filter(a => a.participantId === session.participantId);
      const riskScore = this.calculateRiskScore(sessionAlerts);
      const riskLevel = this.determineRiskLevel(riskScore);
      
      const alertPatterns = this.analyzeAlertPatterns(sessionAlerts);
      const behaviorProfile = this.generateBehaviorProfile(sessionAlerts);

      return {
        userId: session.userId,
        participantId: session.participantId,
        studentName: session.user?.fullName,
        riskScore,
        riskLevel,
        totalAlerts: sessionAlerts.length,
        alertPatterns,
        behaviorProfile,
        timeline: sessionAlerts.map(alert => ({
          time: alert.detectedAt,
          type: alert.alertType,
          confidence: alert.confidence,
          severity: this.getAlertSeverity(alert.alertType),
        })),
      };
    });

    // Overall risk assessment
    const overallRisk = this.calculateOverallRisk(riskAnalysis);

    return {
      meetingId,
      generatedAt: new Date(),
      overallRisk,
      participantRiskAnalysis: riskAnalysis.sort((a, b) => b.riskScore - a.riskScore),
      riskTrends: this.analyzeRiskTrends(alerts),
      recommendations: this.generateOverallRecommendations(riskAnalysis),
    };
  }

  // ===== REAL-TIME DASHBOARD DATA =====
  async getDashboardData(meetingId: string) {
    const [statistics, recentAlerts, highRiskParticipants] = await Promise.all([
      this.getMeetingStatistics(meetingId),
      this.getLiveAlerts(meetingId),
      this.getHighRiskParticipants(meetingId),
    ]);

    return {
      statistics,
      recentAlerts: recentAlerts.slice(0, 10), // Last 10 alerts
      highRiskParticipants,
      lastUpdated: new Date(),
    };
  }

  async getLiveAlerts(meetingId: string) {
    // Get alerts from the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    return this.alertRepo.find({
      where: {
        meetingId,
        detectedAt: MoreThan(fiveMinutesAgo),
      },
      relations: ['user'],
      order: { detectedAt: 'DESC' },
      take: 50, // Limit to recent alerts
    });
  }

  async getHighRiskParticipants(meetingId: string) {
    const [sessions, alerts] = await Promise.all([
      this.sessionRepo.find({ 
        where: { meetingId },
        relations: ['user']
      }),
      this.alertRepo.find({ where: { meetingId } }),
    ]);

    return sessions
      .map(session => {
        const sessionAlerts = alerts.filter(a => a.participantId === session.participantId);
        const riskScore = this.calculateRiskScore(sessionAlerts);
        return {
          userId: session.userId,
          participantId: session.participantId,
          studentName: session.user?.fullName,
          riskScore,
          riskLevel: this.determineRiskLevel(riskScore),
          alertCount: sessionAlerts.length,
          lastAlert: sessionAlerts[0]?.detectedAt || null,
        };
      })
      .filter(participant => participant.riskLevel === 'HIGH' || participant.riskLevel === 'CRITICAL')
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  // ===== HELPER METHODS =====
  private calculateRiskScore(alerts: ProctoringAlert[]): number {
    if (alerts.length === 0) return 0;
    
    const weights: Record<AlertType, number> = {
      'DEEPFAKE_DETECTED': 1.0,
      'MULTIPLE_FACES': 0.8,
      'PHONE_DETECTED': 0.7,
      'COPY_PASTE': 0.6,
      'TAB_SWITCH': 0.5,
      'WINDOW_SWITCH': 0.5,
      'FACE_NOT_DETECTED': 0.4,
      'SUSPICIOUS_BEHAVIOR': 0.6,
      'UNAUTHORIZED_DEVICE': 0.7,
      'NO_FACE': 0.4,
      'VOICE_DETECTED': 0.2,
      'BACKGROUND_NOISE': 0.1,
      'EYE_GAZE_DEVIATION': 0.3,
      'FACE_VERIFIED': 0.0,
    };
    
    const totalWeight = alerts.reduce((sum, alert) => {
      return sum + (weights[alert.alertType] || 0.3) * alert.confidence;
    }, 0);
    
    return Math.min(totalWeight / alerts.length, 1.0);
  }

  private determineRiskLevel(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (riskScore >= 0.8) return 'CRITICAL';
    if (riskScore >= 0.6) return 'HIGH';
    if (riskScore >= 0.3) return 'MEDIUM';
    return 'LOW';
  }

  private getMostCommonAlert(alerts: any[]): string {
    const counts = alerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, '');
  }

  private groupAlertsByHour(alerts: ProctoringAlert[]) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const alertsByHour = hours.reduce((acc, hour) => {
      acc[hour] = 0;
      return acc;
    }, {} as Record<number, number>);

    alerts.forEach(alert => {
      const hour = new Date(alert.detectedAt).getHours();
      alertsByHour[hour]++;
    });

    return alertsByHour;
  }

  private calculateAverageDuration(sessions: MeetingSession[]) {
    const validSessions = sessions.filter(s => s.endedAt);
    if (validSessions.length === 0) return 0;

    const totalDuration = validSessions.reduce((sum, session) => {
      return sum + (session.endedAt.getTime() - session.joinedAt.getTime());
    }, 0);

    return totalDuration / validSessions.length / 1000; // Return in seconds
  }

  private analyzeAlertPatterns(alerts: ProctoringAlert[]) {
    const patterns = {
      frequency: alerts.length,
      timeBetweenAlerts: this.calculateTimeBetweenAlerts(alerts),
      commonTypes: this.getMostCommonAlertTypes(alerts),
      confidenceTrend: this.calculateConfidenceTrend(alerts),
    };

    return patterns;
  }

  private generateBehaviorProfile(alerts: ProctoringAlert[]) {
    const profile = {
      vigilance: this.calculateVigilanceScore(alerts),
      consistency: this.calculateConsistencyScore(alerts),
      riskFactors: this.identifyRiskFactors(alerts),
    };

    return profile;
  }

  private calculateOverallRisk(riskAnalysis: any[]) {
    if (riskAnalysis.length === 0) return 'LOW';

    const averageRisk = riskAnalysis.reduce((sum, analysis) => sum + analysis.riskScore, 0) / riskAnalysis.length;
    const highRiskCount = riskAnalysis.filter(a => a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL').length;
    const highRiskPercentage = (highRiskCount / riskAnalysis.length) * 100;

    if (highRiskPercentage > 30 || averageRisk > 0.7) return 'HIGH';
    if (highRiskPercentage > 15 || averageRisk > 0.5) return 'MEDIUM';
    return 'LOW';
  }

  private analyzeRiskTrends(alerts: ProctoringAlert[]) {
    const hourlyTrends = this.groupAlertsByHour(alerts);
    return {
      hourly: hourlyTrends,
      peakHours: this.findPeakHours(hourlyTrends),
    };
  }

  private findPeakHours(hourlyTrends: Record<number, number>) {
    return Object.entries(hourlyTrends)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  private generateRecommendations(alerts: ProctoringAlert[], riskLevel: string) {
    const recommendations:string[] = [];

    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      recommendations.push('Consider one-on-one review with student');
      recommendations.push('Verify academic integrity for submitted work');
    }

    const alertTypes = alerts.map(a => a.alertType);
    if (alertTypes.includes('PHONE_DETECTED')) {
      recommendations.push('Remind student about device usage policy');
    }

    if (alertTypes.includes('TAB_SWITCH') || alertTypes.includes('WINDOW_SWITCH')) {
      recommendations.push('Discuss focus and attention during exams');
    }

    if (alertTypes.includes('FACE_NOT_DETECTED')) {
      recommendations.push('Verify camera setup and environment');
    }

    return recommendations;
  }

  private generateOverallRecommendations(riskAnalysis: any[]) {
    const highRiskCount = riskAnalysis.filter(a => a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL').length;
    const recommendations:string[] = [];

    if (highRiskCount > 0) {
      recommendations.push(`Review ${highRiskCount} high-risk student(s) individually`);
    }

    const totalAlerts = riskAnalysis.reduce((sum, analysis) => sum + analysis.totalAlerts, 0);
    if (totalAlerts > riskAnalysis.length * 5) {
      recommendations.push('Consider reinforcing proctoring guidelines');
    }

    return recommendations;
  }

  private calculateTimeBetweenAlerts(alerts: ProctoringAlert[]) {
    if (alerts.length < 2) return [];

    const times: number[] = [];
    for (let i = 1; i < alerts.length; i++) {
      const timeDiff = alerts[i].detectedAt.getTime() - alerts[i - 1].detectedAt.getTime();
      times.push(timeDiff / 1000); // Convert to seconds
    }
    return times;
  }

  private getMostCommonAlertTypes(alerts: ProctoringAlert[]) {
    const typeCounts = alerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
  }

  private calculateConfidenceTrend(alerts: ProctoringAlert[]) {
    if (alerts.length === 0) return 'STABLE';
    
    const firstHalf = alerts.slice(0, Math.floor(alerts.length / 2));
    const secondHalf = alerts.slice(Math.floor(alerts.length / 2));
    
    const avgFirst = firstHalf.reduce((sum, a) => sum + a.confidence, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, a) => sum + a.confidence, 0) / secondHalf.length;
    
    if (avgSecond > avgFirst + 0.1) return 'INCREASING';
    if (avgSecond < avgFirst - 0.1) return 'DECREASING';
    return 'STABLE';
  }

  private calculateVigilanceScore(alerts: ProctoringAlert[]) {
    if (alerts.length === 0) return 100;
    
    const seriousAlerts = alerts.filter(a => 
      this.getAlertSeverity(a.alertType) === 'HIGH' || 
      this.getAlertSeverity(a.alertType) === 'CRITICAL'
    ).length;
    
    return Math.max(0, 100 - (seriousAlerts / alerts.length) * 100);
  }

  private calculateConsistencyScore(alerts: ProctoringAlert[]) {
    if (alerts.length < 2) return 100;
    
    const timeDiffs = this.calculateTimeBetweenAlerts(alerts);
    const avgDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
    const variance = timeDiffs.reduce((sum, diff) => sum + Math.pow(diff - avgDiff, 2), 0) / timeDiffs.length;
    
    return Math.max(0, 100 - (variance / 60)); // Normalize by 60 seconds
  }

  private identifyRiskFactors(alerts: ProctoringAlert[]) {
    const factors = new Set<string>();
    
    alerts.forEach(alert => {
      switch (alert.alertType) {
        case 'PHONE_DETECTED':
          factors.add('UNAUTHORIZED_DEVICES');
          break;
        case 'TAB_SWITCH':
        case 'WINDOW_SWITCH':
          factors.add('DISTRACTION');
          break;
        case 'FACE_NOT_DETECTED':
          factors.add('ATTENTION_ISSUES');
          break;
        case 'COPY_PASTE':
          factors.add('ACADEMIC_INTEGRITY');
          break;
      }
    });
    
    return Array.from(factors);
  }
    private async sendRealTimeAlert(meetingId: string, participantId: string, alert: any): Promise<void> {
    try {
      const alertData = {
        participantId,
        alertType: alert.alertType,
        description: alert.description,
        confidence: alert.confidence,
        severity: this.getAlertSeverity(alert.alertType),
        meetingId,
        timestamp: new Date(),
      };
      
      // This now only sends to tutors in the room
      await this.livekitService.broadcastProctoringAlert(meetingId, alertData);
      this.logger.log(`Real-time alert sent to tutors for ${participantId}: ${alert.alertType}`);
    } catch (error) {
      this.logger.error('Failed to send real-time alert:', error);
    }
  }

  // New method to send periodic dashboard updates (optional)
  async sendLiveDashboardUpdate(meetingId: string): Promise<void> {
    try {
      const dashboardData = await this.getDashboardData(meetingId);
      await this.livekitService.sendDashboardUpdate(meetingId, dashboardData);
    } catch (error) {
      this.logger.error('Failed to send live dashboard update:', error);
    }
  }
}