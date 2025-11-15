// dto/kick-participant.dto.ts
import { IsUUID, IsNotEmpty } from 'class-validator';

export class KickParticipantDto {
  @IsUUID()
  @IsNotEmpty()
  meetingId: string;

  @IsUUID()
  @IsNotEmpty()
  tutorId: string;

  @IsUUID()
  @IsNotEmpty()
  studentId: string;
}
