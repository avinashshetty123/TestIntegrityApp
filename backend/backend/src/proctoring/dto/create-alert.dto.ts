import { IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';

export class CreateAlertDto {
  @IsString()
  meetingId: string;

  @IsString()
  studentId: string;

  @IsEnum(['multiple_faces', 'no_face', 'phone_detected', 'face_mismatch', 'suspicious_object'])
  alertType: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsString()
  message: string;

  @IsEnum(['low', 'medium', 'high'])
  severity: string;
}