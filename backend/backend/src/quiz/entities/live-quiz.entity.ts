import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Meeting } from '../../meetings/entity/meeting.entity';

@Entity('live_quizzes')
export class LiveQuiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meetingId: string;

  @ManyToOne(() => Meeting)
  meeting: Meeting;

  @Column()
  questionId: string;

  @Column()
  question: string;

 @Column()
type: 'MCQ' | 'SHORT_ANSWER' | 'TRUE_FALSE';


  @Column('json', { nullable: true })
  options?: string[];

  @Column({ nullable: true })
  correctAnswer: string;

  @Column()
  timeLimit: number; // seconds

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt?: Date;
}