import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, Column, OneToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Test } from './test.entity';
import { Answer } from './answers.entity';
import { JoinColumn } from 'typeorm';
import { Result } from './results.entity';

@Entity()
export class Submission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' }) // ✅ explicitly link the FK
  student: User;
  @Column()
studentId: string;
  @ManyToOne(() => Test, (test) => test.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'testId' })
  test: Test;

@Column()
testId: number;
@OneToMany(() => Answer, (a) => a.submission, { eager: true,cascade:true })
answers: Answer[];
@OneToOne(() => Result, result => result.submission, { eager: true, cascade: true })
  result: Result;

  @Column({ default: false })
  evaluated: boolean;

  @Column({ default: false })
isFinal: boolean;

@Column({ type: 'timestamp', nullable: true })
submittedAt?: Date;


  @Column({ nullable: true })
  totalScore: number;
  @Column({nullable:true})
  score:number

  @Column({ nullable: true })
  violations: number;
}
