import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('proctoring_alert')
export class ProctoringAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  meetingId: string;

  @Column({ nullable: true })
  participantId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  alertType: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 3, scale: 2, nullable: true, default: 0.5 })
  confidence: number;

  @Column({ default: 'MEDIUM' })
  severity: string; // LOW, MEDIUM, HIGH, CRITICAL

  @CreateDateColumn()
  detectedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}