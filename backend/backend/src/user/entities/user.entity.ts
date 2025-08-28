import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Submission } from '../../tests/entities/submissions.entity';
import { Test } from '../../tests/entities/test.entity';

export enum UserRole {
  STUDENT = 'student',
  TUTOR = 'tutor',
  ADMIN = 'admin',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string; // hashed password (nullable for Google login)

  @Column()
  fullName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  // --- Student-specific fields ---
  @Column({ nullable: true })
  rollNumber: string;



  @Column({ nullable: true })
  institutionName: string;

  // --- Tutor-specific fields ---
  @Column({ nullable: true })
  designation: string;

  @Column({ nullable: true })
  department: string;

  // --- Common fields ---
  @Column({ nullable: true })
  profilePic: string; // link to profile picture

  @Column({ nullable: true })
  googleId: string; // for Google login

  @Column({ nullable: true })
  googleRefreshToken: string;

  @Column({ nullable: true })
  refreshToken: string; // JWT refresh token for auth

  // --- Relations ---
  @OneToMany(() => Submission, (s) => s.student)
  submissions: Submission[];

  @OneToMany(() => Test, (t) => t.creator)
  createdTests: Test[];
}
