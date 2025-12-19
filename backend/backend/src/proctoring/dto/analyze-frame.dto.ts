export class AnalyzeFrameDto {
  meetingId: string;
  userId: string;
  participantId: string;
  detections: {
    faceDetected?: boolean;
    faceCount?: number;
    phoneDetected?: boolean;
    suspiciousBehavior?: boolean;
    identityVerified?: boolean;
  };
  browserData?: {
    tabSwitch?: boolean;
    windowSwitch?: boolean;
    copyPaste?: boolean;
    manualFlag?: boolean;
  };
}