import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProctoringAlert } from '../meetings/entities/proctoring-alert.entity';
import { MeetingSession } from '../meetings/entities/meeting-session.entity';

@Injectable()
export class DeepfakeService {
  private pythonServiceUrl = 'http://localhost:8000/predict';

  constructor(
    @InjectRepository(ProctoringAlert)
    private readonly alertRepo: Repository<ProctoringAlert>,

    @InjectRepository(MeetingSession)
    private readonly sessionRepo: Repository<MeetingSession>,
  ) {}

  async analyzeImage(
    file: Express.Multer.File,
    userId: string,
    meetingId: string,
    participantId: string,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path), file.originalname);

    try {
      // 🔹 Call Python Deepfake API
      const response = await axios.post(this.pythonServiceUrl, formData, {
        headers: formData.getHeaders(),
      });

      const result = response.data;

      // 🔹 Save result as a proctoring alert
      const alert = this.alertRepo.create({
        meetingId,
        userId,
        participantId,
        alertType: result.label === 'fake' ? 'DEEPFAKE_DETECTED':'FACE_VERIFIED',
        description:
          result.label === 'fake'
            ? 'Potential deepfake or synthetic face detected'
            : 'Face verified as authentic',
        confidence: result.confidence,
        metadata: result,
      });
      await this.alertRepo.save(alert);

      // 🔹 Update meeting session flags/stats (optional)
      const session = await this.sessionRepo.findOne({
        where: { meetingId, participantId },
      });

      if (session) {
        if (result.label === 'fake') {
          session.flagCount += 1;
          session.criticalFlags += 1;
          session.flagged = true;
        }
        session.lastFlagAt = new Date();
        await this.sessionRepo.save(session);
      }

      return {
        message: 'Deepfake analysis complete',
        result,
      };
    } catch (err) {
      throw new HttpException(
        'Python service error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      // Cleanup temp file
      fs.unlinkSync(file.path);
    }
  }
}
