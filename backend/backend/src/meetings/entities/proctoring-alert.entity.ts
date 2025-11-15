import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Meeting } from '../entity/meeting.entity';
import { User } from '../../user/entities/user.entity';

@Entity('proctoring_alerts')
export class ProctoringAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meetingId: string;

  @ManyToOne(() => Meeting)
  meeting: Meeting;

  @Column()
  userId: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column()
  participantId: string;

  @Column()
  alertType: 'FACE_NOT_DETECTED' | 'MULTIPLE_FACES' | 'PHONE_DETECTED' | 'TAB_SWITCH' | 'SUSPICIOUS_BEHAVIOR' | 'DEEPFAKE_DETECTED' | 'COPY_PASTE' | 'WINDOW_SWITCH' | 'UNAUTHORIZED_DEVICE'|'FACE_VERIFIED'|'NO_FACE'| 'VOICE_DETECTED'
  | 'BACKGROUND_NOISE'
  | 'EYE_GAZE_DEVIATION';

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'float', default: 0.8 })
  confidence: number;

  @Column({ type: 'json', nullable: true })
  metadata?: any;

  @CreateDateColumn()
  detectedAt: Date;
}