import { IsOptional, IsString } from 'class-validator';

export class JoinMeetingDto {
  @IsOptional()
  @IsString()
  displayName?: string;
}
