import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Meeting } from '../entity/meeting.entity';

@Entity('meeting_sessions')
export class MeetingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meetingId: string;

  @ManyToOne(() => Meeting)
  meeting: Meeting;

  @Column()
  participantId: string;

  @Column()
  participantName: string;

  @Column()
  participantType: string; // 'tutor' | 'student'

  @CreateDateColumn()
  joinedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  leftAt?: Date;

  @Column({ default: 0 })
  totalAlerts: number;

  @Column({ default: 0 })
  highSeverityAlerts: number;

  @Column({ default: 0 })
  mediumSeverityAlerts: number;

  @Column({ default: 0 })
  lowSeverityAlerts: number;

  @Column({ type: 'json', nullable: true })
  sessionData?: {
    faceVerificationAttempts: number;
    eyeTrackingScore: number;
    behaviorScore: number;
    deviceViolations: number;
    suspiciousActivities: string[];
  };

  @Column({ default: false })
  flagged: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}