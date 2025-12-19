import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('proctoring_sessions')
export class ProctoringSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meetingId: string;

  @Column()
  participantId: string;

  @CreateDateColumn()
  startedAt: Date;

  @UpdateDateColumn()
  lastActivity: Date;

  @Column({ default: 0 })
  totalAlerts: number;

  @Column({ default: false })
  flagged: boolean;

  @Column({ type: 'jsonb', nullable: true })
  sessionData: any;
}