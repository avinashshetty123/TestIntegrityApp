import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProctoringAlert } from './entities/proctoring-alert.entity';
import { FaceVerification } from './entities/face-verification.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { VerifyFaceDto } from './dto/verify-face.dto';
import axios from 'axios';

@Injectable()
export class ProctoringService {
  constructor(
    @InjectRepository(ProctoringAlert)
    private alertRepo: Repository<ProctoringAlert>,
    @InjectRepository(FaceVerification)
    private faceRepo: Repository<FaceVerification>,
  ) {}

  async createAlert(dto: CreateAlertDto) {
    const alert = this.alertRepo.create(dto);
    return this.alertRepo.save(alert);
  }

  async verifyFace(dto: VerifyFaceDto, capturedImage: Express.Multer.File) {
    try {
      // Simulate deepfake detection
      const isDeepfake = Math.random() < 0.1; // 10% chance

      // Compare faces using face recognition API
      const matchScore = await this.compareFaces(dto.cloudinaryImageUrl, capturedImage);
      const isMatch = matchScore > 0.7; // 70% threshold

      const verification = this.faceRepo.create({
        studentId: dto.studentId,
        meetingId: dto.meetingId,
        cloudinaryImageUrl: dto.cloudinaryImageUrl,
        capturedImageUrl: 'temp_captured_image_url',
        matchScore,
        isMatch,
        isDeepfake,
      });

      await this.faceRepo.save(verification);

      // Create alert if face doesn't match or is deepfake
      if (!isMatch || isDeepfake) {
        await this.createAlert({
          meetingId: dto.meetingId,
          studentId: dto.studentId,
          alertType: 'face_mismatch',
          confidence: isDeepfake ? 0.95 : (1 - matchScore),
          message: isDeepfake ? 'Deepfake detected' : 'Face does not match registered image',
          severity: 'high',
        });
      }

      return { isMatch, isDeepfake, matchScore };
    } catch (error) {
      throw new HttpException('Face verification failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async compareFaces(cloudinaryUrl: string, capturedImage: Express.Multer.File): Promise<number> {
    // Simulate face comparison - replace with actual face recognition API
    return Math.random() * 0.4 + 0.6; // Random score between 0.6-1.0
  }

  async processYoloDetection(meetingId: string, studentId: string, detections: any[]) {
    const people = detections.filter(d => d.class === 'person');
    const phones = detections.filter(d => d.class === 'cell phone');

    if (people.length > 1) {
      await this.createAlert({
        meetingId,
        studentId,
        alertType: 'multiple_faces',
        confidence: Math.max(...people.map(p => p.confidence)),
        message: `${people.length} people detected`,
        severity: 'high',
      });
    }

    if (people.length === 0) {
      await this.createAlert({
        meetingId,
        studentId,
        alertType: 'no_face',
        confidence: 1.0,
        message: 'No person detected in frame',
        severity: 'medium',
      });
    }

    if (phones.length > 0) {
      await this.createAlert({
        meetingId,
        studentId,
        alertType: 'phone_detected',
        confidence: Math.max(...phones.map(p => p.confidence)),
        message: 'Mobile phone detected',
        severity: 'high',
      });
    }

    return { processed: true };
  }

  async getAlertsForMeeting(meetingId: string) {
    return this.alertRepo.find({
      where: { meetingId },
      order: { timestamp: 'DESC' },
    });
  }

  async getFlaggedStudents(meetingId: string) {
    const alerts = await this.alertRepo
      .createQueryBuilder('alert')
      .select('alert.studentId')
      .addSelect('COUNT(*)', 'alertCount')
      .addSelect('MAX(alert.severity)', 'maxSeverity')
      .where('alert.meetingId = :meetingId', { meetingId })
      .groupBy('alert.studentId')
      .having('COUNT(*) > 2 OR MAX(alert.severity) = :severity', { severity: 'high' })
      .getRawMany();

    return alerts;
  }

  async resolveAlert(alertId: string) {
    await this.alertRepo.update(alertId, { resolved: true });
    return { message: 'Alert resolved' };
  }
}