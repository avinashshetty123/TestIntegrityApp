import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Meeting } from '../entity/meeting.entity';

@Entity('meeting_lock_requests')
export class MeetingLockRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meetingId: string;

  @ManyToOne(() => Meeting)
  meeting: Meeting;

  @Column()
  studentId: string;

  @Column()
  studentName: string;

  @Column()
  reason: string;

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Column({ nullable: true })
  tutorResponse?: string;

  @CreateDateColumn()
  requestedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt?: Date;
}