import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('face_verifications')
export class FaceVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studentId: string;

  @Column()
  meetingId: string;

  @Column()
  cloudinaryImageUrl: string;

  @Column()
  capturedImageUrl: string;

  @Column('decimal', { precision: 3, scale: 2 })
  matchScore: number;

  @Column({ default: false })
  isMatch: boolean;

  @Column({ default: false })
  isDeepfake: boolean;

  @CreateDateColumn()
  verifiedAt: Date;
}