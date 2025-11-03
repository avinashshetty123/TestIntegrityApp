import { IsString } from 'class-validator';

export class VerifyFaceDto {
  @IsString()
  meetingId: string;

  @IsString()
  studentId: string;

  @IsString()
  cloudinaryImageUrl: string;
}