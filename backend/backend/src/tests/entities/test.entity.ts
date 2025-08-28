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
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  // 👨‍🏫 Teacher who created the test
  @ManyToOne(() => User, (user) => user.createdTests, { eager: true })
  creator: User;

  // 🏫 Optional institution (useful if tests are institution-based)
  @Column({ nullable: true })
  institutionName: string;

  // 📄 Questions inside test
  @OneToMany(() => Question, (q) => q.test, { cascade: true })
  questions: Question[];

  // 📝 Student submissions
  @OneToMany(() => Submission, (s) => s.test, { cascade: true })
  submissions: Submission[];

  // ⏰ Auto timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
