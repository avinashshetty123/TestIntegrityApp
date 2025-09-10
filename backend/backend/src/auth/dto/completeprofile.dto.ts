import { UserRole } from "src/user/entities/user.entity";
import { IsEnum,IsOptional } from "class-validator";
export class CompleteProfileDto {
  @IsEnum(UserRole)
  role: UserRole;

  // Student fields
  @IsOptional()
  rollNumber?: string;

  @IsOptional()
  studentUid?: string;

  @IsOptional()
  institutionName?: string;

  // Tutor fields
  @IsOptional()
  designation?: string;

  @IsOptional()
  department?: string;

  // Common
  @IsOptional()
  profilePic?: string;

  @IsOptional()
  publicId?: string;
}
