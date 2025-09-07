import { User } from "src/user/entities/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

export type MeetingStatus = 'SCHEDULED' | 'LIVE' | 'ENDED';

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  @Column({ type: 'varchar', default: 'SCHEDULED' })
  status: MeetingStatus;

  @Column({ type: 'varchar', unique: true })
  roomName: string;

  @ManyToOne(() => User, { eager: true })
  teacher: User;

  @Column()
  teacherId: string; // foreign key column
}
