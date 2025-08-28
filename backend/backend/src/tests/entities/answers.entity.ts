import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Question } from './questions.entity';
import { Submission } from './submissions.entity';

@Entity()
export class Answer {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Submission, (s) => s.answers)
  submission: Submission;

  @ManyToOne(() => Question)
  question: Question;

  @Column({ type: 'text' })
  answerText: string;

  @Column({ nullable: true })
  score: number;
  @Column({nullable:true})
  response:string;
}
