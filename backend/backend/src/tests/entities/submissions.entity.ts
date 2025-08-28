import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, Column } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Test } from './test.entity';
import { Answer } from './answers.entity';

@Entity()
export class Submission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.submissions)
  student: User;

  @ManyToOne(() => Test, (test) => test.submissions)
  test: Test;

  @OneToMany(() => Answer, (a) => a.submission, { cascade: true })
  answers: Answer[];

  @Column({ default: false })
  evaluated: boolean;

  @Column({ nullable: true })
  totalScore: number;
  @Column({nullable:true})
  score:number
}
