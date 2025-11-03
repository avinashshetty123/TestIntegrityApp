import { User } from "src/user/entities/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type MeetingStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'LOCKED';

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  institution?: string;

  @Column({ nullable: true })
  subject?: string;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  @Column({ type: 'varchar', default: 'SCHEDULED' })
  status: MeetingStatus;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ type: 'varchar', unique: true })
  roomName: string;

  @ManyToOne(() => User, { eager: true })
  teacher: User;

  @Column()
  teacherId: string;

  @Column({ default: false })
  isLocked: boolean;

  @Column({ default: false })
  requireApproval: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
