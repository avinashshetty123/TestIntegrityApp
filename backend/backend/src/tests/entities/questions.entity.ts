import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Test } from './test.entity';

export enum QuestionType {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT = 'SHORT',
  ESSAY = 'ESSAY',
}

@Entity()
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Test, (test) => test.questions)
  test: Test;

  @Column()
  questionText: string;

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  @Column({ type: 'json', nullable: true })
  options: string[]; // for MCQ/TrueFalse

  @Column({ nullable: true })
  correctAnswer: string; // for MCQ/TrueFalse

  @Column({ type: 'int', default: 1 })
  marks: number;
}
