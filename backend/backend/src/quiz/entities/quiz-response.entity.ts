import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { LiveQuiz } from './live-quiz.entity';

@Entity('quiz_responses')
export class QuizResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  quizId: string;

  @ManyToOne(() => LiveQuiz,{eager:true})
  quiz: LiveQuiz;

  @Column()
  studentId: string;

  @Column()
  studentName: string;

  @Column()
  answer: string;

  @Column({ default: false })
  isCorrect: boolean;

  @Column()
  responseTime: number; // milliseconds

  @CreateDateColumn()
  submittedAt: Date;


}