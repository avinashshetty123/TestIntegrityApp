import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('proctoring_sessions')
export class ProctoringSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meetingId: string;

  @Column()
  participantId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  studentName: string;

  @CreateDateColumn()
  startedAt: Date;

  @UpdateDateColumn()
  lastActivity: Date;

  @Column({ default: 0 })
  totalAlerts: number;

  @Column({ default: false })
  flagged: boolean;

  @Column({ default: 'ACTIVE' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  sessionData: any;
}