import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Question } from './questions.entity';
import { Submission } from './submissions.entity';
import { JoinColumn } from 'typeorm';
@Entity()
export class Answer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  submissionId: number; // ✅ Important

  @ManyToOne(() => Submission, (submission) => submission.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submissionId' })
  submission: Submission;

   @Column()
  questionId: number; // ✅ Important

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: Question;

  @Column('text', { array: true })
  response: string[]|string;

  @Column({ nullable: true })
  answerText?: string;
  @Column({ nullable: true })
  score: number;
}
