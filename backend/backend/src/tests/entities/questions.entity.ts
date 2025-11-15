import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Test } from './test.entity';

export enum QuestionType {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT = 'SHORT',
  ESSAY = 'ESSAY',
}

@Entity('questions')

export class Question {
  @PrimaryGeneratedColumn()
  id: number; // optional for creation

  @ManyToOne(() => Test, (test) => test.questions, { onDelete: 'CASCADE' })
  test: Test;

  @Column()
  questionText: string;

  @Column({ nullable: true })
  testPic?: string;

  @Column({ nullable: true })
  publicId?: string;

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  @Column('text', { array: true, nullable: true })
  options: string[];

  @Column('text', { array: true, nullable: true })
  correctAnswers: string[];

  @Column({ type: 'int', default: 1 })
  marks: number;
}
