import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Submission } from './submissions.entity';

@Entity()
export class Result {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Submission)
  submission: Submission;

  @Column()
  totalScore: number;

  @Column({ type: 'json', nullable: true })
  feedback: string; // can store AI feedback for essays
}
