import { IsOptional, IsObject, IsString, IsBoolean } from 'class-validator';

export class AnalyzeFrameDto {
  @IsOptional()
  @IsString()
  meetingId?: string;
  
  @IsOptional()
  @IsString()
  userId?: string;
  
  @IsOptional()
  @IsString()
  participantId?: string;
  
  @IsOptional()
  @IsString()
  sessionId?: string;
  
  @IsOptional()
  @IsObject()
  detections?: {
    faceDetected?: boolean;
    faceCount?: number;
    phoneDetected?: boolean;
    suspiciousBehavior?: boolean;
    identityVerified?: boolean;
  };
  
  @IsOptional()
  @IsObject()
  browserData?: {
    tabSwitch?: boolean;
    windowSwitch?: boolean;
    copyPaste?: boolean;
    manualFlag?: boolean;
    automatedDetection?: boolean;
    participantLeft?: boolean;
    alertType?: string;
    description?: string;
    confidence?: number;
    severity?: string;
    timestamp?: string;
    frameAnalysis?: boolean;
  };
}