import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('proctoring_alerts')
export class ProctoringAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meetingId: string;

  @Column()
  studentId: string;

  @Column()
  alertType: string; // 'multiple_faces', 'no_face', 'phone_detected', 'face_mismatch'

  @Column('decimal', { precision: 3, scale: 2 })
  confidence: number;

  @Column()
  message: string;

  @Column()
  severity: string; // 'low', 'medium', 'high'

  @Column({ default: false })
  resolved: boolean;

  @CreateDateColumn()
  timestamp: Date;
}