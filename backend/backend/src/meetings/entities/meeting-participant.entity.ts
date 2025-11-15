import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, UpdateDateColumn } from 'typeorm';
import { Meeting } from '../entity/meeting.entity';
import { User } from '../../user/entities/user.entity';

@Entity('meeting_participants')
export class MeetingParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meetingId: string;

  @ManyToOne(() => Meeting)
  meeting: Meeting;

  @Column()
  userId: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'JOINED' | 'LEFT' | 'REMOVED';

  @Column({ type: 'timestamptz', nullable: true })
  joinedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  leftAt?: Date;

  @Column({ type: 'int', default: 0 })
  totalDuration: number; // in seconds

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}