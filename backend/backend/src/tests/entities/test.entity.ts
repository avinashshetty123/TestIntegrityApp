import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Question } from './questions.entity';
import { Submission } from './submissions.entity';
import { User } from '../../user/entities/user.entity';

@Entity('tests')
export class Test {
 @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @ManyToOne(() => User, (user) => user.createdTests, { eager: true })
  creator: User;

  @Column({ nullable: true })
  institutionName?: string;

  @OneToMany(() => Question, (q) => q.test, { cascade: true, eager: true })
  questions?: Question[];

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  @OneToMany(()=>Submission,(s)=>s.test,{cascade:true,eager:true})
  submissions?:Submission[];

}
