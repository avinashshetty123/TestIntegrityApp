import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProctoringAlert } from './entities/proctoring-alert.entity';
import { ProctoringSession } from './entities/proctoring-session.entity';
import { AnalyzeFrameDto } from './dto/analyze-frame.dto';

@Injectable()
export class ProctoringService {
  constructor(
    @InjectRepository(ProctoringAlert)
    private alertRepo: Repository<ProctoringAlert>,
    @InjectRepository(ProctoringSession)
    private sessionRepo: Repository<ProctoringSession>,
  ) {}

  async analyzeFrame(data: AnalyzeFrameDto) {
    const alerts: ProctoringAlert[] = [];
    const timestamp = new Date();

    // Face detection alerts
    if (data.detections.faceCount === 0) {
      alerts.push(this.createAlert(data, 'NO_FACE', 'No face detected', 0.8, 'MEDIUM'));
    } else if (data.detections.faceCount && data.detections.faceCount > 1) {
      alerts.push(this.createAlert(data, 'MULTIPLE_FACES', `${data.detections.faceCount} faces detected`, 0.9, 'HIGH'));
    }

    // Phone detection
    if (data.detections.phoneDetected) {
      alerts.push(this.createAlert(data, 'PHONE_DETECTED', 'Mobile phone detected in frame', 0.85, 'HIGH'));
    }

    // Browser behavior
    if (data.browserData?.tabSwitch) {
      alerts.push(this.createAlert(data, 'TAB_SWITCH', 'Tab switching detected', 0.7, 'MEDIUM'));
    }

    if (data.browserData?.windowSwitch) {
      alerts.push(this.createAlert(data, 'WINDOW_SWITCH', 'Window switching detected', 0.8, 'HIGH'));
    }

    if (data.browserData?.copyPaste) {
      alerts.push(this.createAlert(data, 'COPY_PASTE', 'Copy/paste activity detected', 0.6, 'MEDIUM'));
    }

    // Suspicious behavior
    if (data.detections.suspiciousBehavior) {
      alerts.push(this.createAlert(data, 'SUSPICIOUS_BEHAVIOR', 'Suspicious behavior detected', 0.7, 'MEDIUM'));
    }

    // Save alerts to database
    if (alerts.length > 0) {
      await this.alertRepo.save(alerts);
    }

    // Update session
    await this.updateSession(data.meetingId, data.participantId, alerts.length);

    return {
      alertsGenerated: alerts.length,
      alerts: alerts.map(alert => ({
        alertType: alert.alertType,
        description: alert.description,
        confidence: alert.confidence,
        severity: alert.severity,
        timestamp: alert.detectedAt
      }))
    };
  }

  private createAlert(data: AnalyzeFrameDto, alertType: string, description: string, confidence: number, severity: string): ProctoringAlert {
    return this.alertRepo.create({
      meetingId: data.meetingId,
      participantId: data.participantId,
      userId: data.userId,
      alertType,
      description,
      confidence,
      severity,
      detectedAt: new Date(),
    });
  }

  async createSession(data: {
    meetingId: string;
    participantId: string;
    userId: string;
    studentName?: string;
    startedAt: string;
  }) {
    // Check if session already exists
    let session = await this.sessionRepo.findOne({
      where: { meetingId: data.meetingId, participantId: data.participantId }
    });

    if (!session) {
      session = this.sessionRepo.create({
        meetingId: data.meetingId,
        participantId: data.participantId,
        userId: data.userId,
        studentName: data.studentName,
        startedAt: new Date(data.startedAt),
        totalAlerts: 0,
        lastActivity: new Date(),
        status: 'ACTIVE'
      });
      
      await this.sessionRepo.save(session);
      console.log(`✅ Created proctoring session for ${data.studentName || data.participantId}`);
    } else {
      session.lastActivity = new Date();
      session.status = 'ACTIVE';
      await this.sessionRepo.save(session);
      console.log(`🔄 Updated existing session for ${data.studentName || data.participantId}`);
    }

    return {
      sessionId: session.id,
      status: 'created',
      participantId: data.participantId,
      meetingId: data.meetingId
    };
  }

  async getSessionParticipants(meetingId: string) {
    const sessions = await this.sessionRepo.find({
      where: { meetingId },
      order: { startedAt: 'DESC' }
    });

    return sessions.map(session => ({
      participantId: session.participantId,
      userId: session.userId,
      studentName: session.studentName,
      joinedAt: session.startedAt,
      lastActivity: session.lastActivity,
      totalAlerts: session.totalAlerts || 0,
      status: session.status || 'ACTIVE',
      duration: session.lastActivity ? 
        Math.floor((session.lastActivity.getTime() - session.startedAt.getTime()) / 1000) : 0
    }));
  }

  async updateSession(meetingId: string, participantId: string, newAlerts: number) {
    let session = await this.sessionRepo.findOne({
      where: { meetingId, participantId }
    });

    if (!session) {
      session = this.sessionRepo.create({
        meetingId,
        participantId,
        startedAt: new Date(),
        totalAlerts: newAlerts,
        lastActivity: new Date(),
        status: 'ACTIVE'
      });
    } else {
      session.totalAlerts = (session.totalAlerts || 0) + newAlerts;
      session.lastActivity = new Date();
    }

    return this.sessionRepo.save(session);
  }

  async getSessionAlerts(meetingId: string, participantId?: string) {
    const query = this.alertRepo.createQueryBuilder('alert')
      .where('alert.meetingId = :meetingId', { meetingId })
      .orderBy('alert.detectedAt', 'DESC');

    if (participantId) {
      query.andWhere('alert.participantId = :participantId', { participantId });
    }

    return query.getMany();
  }

  async getMeetingStats(meetingId: string) {
    const alerts = await this.alertRepo.find({ where: { meetingId } });
    const sessions = await this.sessionRepo.find({ where: { meetingId } });

    return {
      totalAlerts: alerts.length,
      totalParticipants: sessions.length,
      highRiskParticipants: sessions.filter(s => (s.totalAlerts || 0) > 5).length,
      alertsByType: alerts.reduce((acc, alert) => {
        acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  async generateProctoringReport(meetingId: string) {
    const alerts = await this.alertRepo.find({ 
      where: { meetingId },
      order: { detectedAt: 'DESC' }
    });
    const sessions = await this.sessionRepo.find({ where: { meetingId } });
    const stats = await this.getMeetingStats(meetingId);

    return {
      meetingId,
      generatedAt: new Date(),
      summary: stats,
      sessions: sessions.map(session => ({
        participantId: session.participantId,
        startedAt: session.startedAt,
        totalAlerts: session.totalAlerts,
        lastActivity: session.lastActivity,
        alerts: alerts.filter(alert => alert.participantId === session.participantId)
      }))
    };
  }

  async getAlertsWithParticipantDetails(meetingId: string) {
    return this.alertRepo.find({
      where: { meetingId },
      order: { detectedAt: 'DESC' }
    });
  }

  async getAlertSummary(meetingId: string) {
    const alerts = await this.alertRepo.find({ where: { meetingId } });
    
    const summary = {
      total: alerts.length,
      bySeverity: {
        LOW: alerts.filter(a => a.severity === 'LOW').length,
        MEDIUM: alerts.filter(a => a.severity === 'MEDIUM').length,
        HIGH: alerts.filter(a => a.severity === 'HIGH').length,
        CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
      },
      byType: alerts.reduce((acc, alert) => {
        acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recent: alerts
        .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
        .slice(0, 10)
    };

    return summary;
  }

  async getLiveAlerts(meetingId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    return this.alertRepo.createQueryBuilder('alert')
      .where('alert.meetingId = :meetingId', { meetingId })
      .andWhere('alert.detectedAt >= :fiveMinutesAgo', { fiveMinutesAgo })
      .orderBy('alert.detectedAt', 'DESC')
      .getMany();
  }

  async recordTestViolation(data: {
    testId: string;
    violationType: string;
    description: string;
    timestamp: string;
  }) {
    const alert = this.alertRepo.create({
      meetingId: data.testId,
      participantId: 'test-participant',
      alertType: data.violationType,
      description: data.description,
      confidence: 1.0,
      severity: 'HIGH',
      detectedAt: new Date(data.timestamp),
      metadata: { isTestViolation: true }
    });

    return this.alertRepo.save(alert);
  }

  async getMeetingFlags(meetingId: string) {
    return this.alertRepo.find({
      where: { meetingId },
      order: { detectedAt: 'DESC' },
      take: 50
    });
  }

  async getTestFlags(testId: string) {
    return this.alertRepo.find({
      where: { 
        meetingId: testId,
        metadata: { isTestViolation: true }
      },
      order: { detectedAt: 'DESC' }
    });
  }

  async generateDetailedReport(meetingId: string) {
    const [alerts, sessions] = await Promise.all([
      this.alertRepo.find({ 
        where: { meetingId },
        order: { detectedAt: 'DESC' }
      }),
      this.sessionRepo.find({ where: { meetingId } })
    ]);

    const participantReports = sessions.map(session => {
      const participantAlerts = alerts.filter(alert => alert.participantId === session.participantId);
      
      const alertsByType = participantAlerts.reduce((acc, alert) => {
        acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const riskScore = this.calculateRiskScore(participantAlerts);

      return {
        userId: session.participantId,
        studentInfo: {
          name: `Student ${session.participantId}`,
          email: `${session.participantId}@example.com`
        },
        totalAlerts: participantAlerts.length,
        alertsByType,
        riskScore,
        timeline: participantAlerts.map(alert => ({
          time: alert.detectedAt.toISOString(),
          type: alert.alertType,
          description: alert.description,
          confidence: alert.confidence,
          severity: alert.severity
        }))
      };
    });

    const highRiskParticipants = participantReports.filter(p => p.riskScore > 0.7).length;
    const mostCommonAlert = this.getMostCommonAlert(alerts);
    const averageRiskScore = participantReports.reduce((sum, p) => sum + p.riskScore, 0) / participantReports.length || 0;

    return {
      meeting: {
        id: meetingId,
        title: `Meeting ${meetingId}`,
        description: 'Proctored meeting session',
        status: 'ENDED',
        subject: 'General'
      },
      participants: {
        total: sessions.length,
        joined: sessions.length,
        left: sessions.length,
        participants: sessions.map(session => {
          const participantAlerts = alerts.filter(alert => alert.participantId === session.participantId);
          return {
            userId: session.participantId,
            name: `Student ${session.participantId}`,
            email: `${session.participantId}@example.com`,
            status: 'LEFT',
            joinedAt: session.startedAt.toISOString(),
            leftAt: session.lastActivity?.toISOString(),
            duration: 3600, // 1 hour default
            alertCount: participantAlerts.length,
            riskLevel: this.getRiskLevel(participantAlerts.length),
            riskScore: this.calculateRiskScore(participantAlerts),
            lastAlert: participantAlerts[0]?.detectedAt.toISOString(),
            flags: {
              total: participantAlerts.length,
              critical: participantAlerts.filter(a => a.severity === 'CRITICAL').length,
              high: participantAlerts.filter(a => a.severity === 'HIGH').length,
              medium: participantAlerts.filter(a => a.severity === 'MEDIUM').length
            }
          };
        })
      },
      proctoring: {
        meetingId,
        generatedAt: new Date().toISOString(),
        totalParticipants: sessions.length,
        totalAlerts: alerts.length,
        participantReports,
        overallSummary: {
          highRiskParticipants,
          mostCommonAlert,
          averageRiskScore
        }
      },
      summary: {
        totalStudents: sessions.length,
        studentsJoined: sessions.length,
        totalAlerts: alerts.length,
        highRiskStudents: highRiskParticipants,
        averageRiskScore,
        mostCommonViolation: mostCommonAlert
      },
      statistics: {
        totalParticipants: sessions.length,
        totalAlerts: alerts.length,
        averageAlertsPerParticipant: alerts.length / sessions.length || 0,
        riskDistribution: this.getRiskDistribution(participantReports),
        alertTypeDistribution: this.getAlertTypeDistribution(alerts),
        participationRate: 100,
        averageSessionDuration: 3600
      }
    };
  }

  async getParticipantDetailedReport(meetingId: string, participantId: string) {
    const alerts = await this.alertRepo.find({
      where: { meetingId, participantId },
      order: { detectedAt: 'DESC' }
    });

    const session = await this.sessionRepo.findOne({
      where: { meetingId, participantId }
    });

    return {
      participant: {
        id: participantId,
        name: `Student ${participantId}`,
        email: `${participantId}@example.com`
      },
      session: {
        startedAt: session?.startedAt,
        lastActivity: session?.lastActivity,
        totalAlerts: session?.totalAlerts || 0
      },
      alerts: alerts.map(alert => ({
        id: alert.id,
        type: alert.alertType,
        description: alert.description,
        severity: alert.severity,
        confidence: alert.confidence,
        timestamp: alert.detectedAt,
        metadata: alert.metadata
      })),
      riskAnalysis: {
        riskScore: this.calculateRiskScore(alerts),
        riskLevel: this.getRiskLevel(alerts.length),
        alertsByType: this.getAlertsByType(alerts),
        timeline: this.generateTimeline(alerts)
      }
    };
  }

  private calculateRiskScore(alerts: any[]): number {
    if (alerts.length === 0) return 0;
    
    const severityWeights = { 'LOW': 0.1, 'MEDIUM': 0.3, 'HIGH': 0.7, 'CRITICAL': 1.0 };
    const totalWeight = alerts.reduce((sum, alert) => {
      return sum + (severityWeights[alert.severity] || 0.3) * (alert.confidence || 0.5);
    }, 0);
    
    return Math.min(totalWeight / alerts.length, 1.0);
  }

  private getRiskLevel(alertCount: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (alertCount === 0) return 'LOW';
    if (alertCount <= 2) return 'MEDIUM';
    if (alertCount <= 5) return 'HIGH';
    return 'CRITICAL';
  }

  private getMostCommonAlert(alerts: any[]): string {
    if (alerts.length === 0) return 'None';
    
    const alertCounts = alerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(alertCounts).reduce((a, b) => 
      alertCounts[a] > alertCounts[b] ? a : b
    );
  }

  private getRiskDistribution(reports: any[]): Record<string, number> {
    return reports.reduce((acc, report) => {
      const level = this.getRiskLevel(report.totalAlerts);
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getAlertTypeDistribution(alerts: any[]): Record<string, number> {
    return alerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getAlertsByType(alerts: any[]): Record<string, number> {
    return alerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private generateTimeline(alerts: any[]): any[] {
    return alerts.map(alert => ({
      timestamp: alert.detectedAt,
      type: alert.alertType,
      description: alert.description,
      severity: alert.severity
    })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}