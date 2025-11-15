import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, OneToOne, JoinColumn } from 'typeorm';
import { Submission } from './submissions.entity';

@Entity()
export class Result {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Submission, submission => submission.result, { onDelete: 'CASCADE' })
  @JoinColumn()
  submission: Submission;

  @Column()
  submissionId: number;

  @Column()
  totalScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentage: number;

  @Column({nullable: true})
  passed: boolean;
  
  @Column({ type: 'json', nullable: true })
  scores: Record<string, number>; // questionId -> score

  @Column({ type: 'json', nullable: true })
  feedbacks: Record<string, string>; // questionId -> feedback

  @Column({ type: 'text', nullable: true })
  overallFeedback: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  gradedAt: Date;
}