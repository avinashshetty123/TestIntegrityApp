import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateMeetingSessionDto {
  @IsString()
  meetingId: string;

  @IsString()
  participantId: string;

  @IsString()
  participantName: string;

  @IsString()
  participantType: 'tutor' | 'student';
}

export class UpdateMeetingSessionDto {
  @IsOptional()
  @IsNumber()
  totalAlerts?: number;

  @IsOptional()
  @IsNumber()
  highSeverityAlerts?: number;

  @IsOptional()
  @IsNumber()
  mediumSeverityAlerts?: number;

  @IsOptional()
  @IsNumber()
  lowSeverityAlerts?: number;

  @IsOptional()
  sessionData?: {
    faceVerificationAttempts: number;
    eyeTrackingScore: number;
    behaviorScore: number;
    deviceViolations: number;
    suspiciousActivities: string[];
  };

  @IsOptional()
  @IsBoolean()
  flagged?: boolean;
}

export class CreateLockRequestDto {
  @IsString()
  meetingId: string;

  @IsString()
  studentId: string;

  @IsString()
  studentName: string;

  @IsString()
  reason: string;
}

export class RespondToLockRequestDto {
  @IsString()
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  tutorResponse?: string;
}