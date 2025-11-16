import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Meeting } from '../entity/meeting.entity';
import { User } from '../../user/entities/user.entity';
import { Test } from 'src/tests/entities/test.entity';
import { IsOptional } from 'class-validator';
import { truncate } from 'fs/promises';
@Entity('meeting_sessions')
export class MeetingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meetingId: string;

  @ManyToOne(() => Meeting,{eager:true})
  meeting: Meeting;

//     @Column()
//     @IsOptional()
//   testId?: number;


// @IsOptional()
//   @ManyToOne(() =>Test )
//   test?: Test;

  @Column()
  participantId: string;

  @Column()
  participantName?: string;

  @Column({nullable:true})
  userId: string;

  @ManyToOne(() => User, { eager: true, })
  user: User;

  @Column()
  participantType: string; // 'tutor' | 'student'

  @CreateDateColumn()
  joinedAt: Date;
  @CreateDateColumn()
  endedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  leftAt?: Date|null;

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

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED';

  @Column({ type: 'int', default: 0 })
  flagCount: number;

  @Column({ type: 'int', default: 0 })
  criticalFlags: number;

  @Column({ type: 'int', default: 0 })
  highFlags: number;

  @Column({ type: 'int', default: 0 })
  mediumFlags: number;

  @Column({ type: 'json', nullable: true })
  alertBreakdown?: Record<string, number>;

  @Column({ type: 'timestamptz', nullable: true })
  lastFlagAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastActivity?: Date;

  @Column({ default: false })
  flagged: boolean;

  @Column({ default: false })
  kicked?: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}