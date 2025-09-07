import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';
import { UserRole } from '../../user/entities/user.entity';

export class TutorRegisterDto {
  @IsNotEmpty({ message: 'Full name cannot be blank.' })
  @IsString({ message: 'Full name must be a string.' })
  fullName: string;

  @IsNotEmpty({ message: 'Email cannot be blank.' })
  @IsEmail({}, { message: 'Invalid email format.' })
  email: string;

  @IsNotEmpty({ message: 'Password cannot be blank.' })
  @IsString({ message: 'Password must be a string.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;

  @IsNotEmpty({ message: 'Institution cannot be blank.' })
  @IsString({ message: 'Institution must be a string.' })
  institutionName: string;

  @IsNotEmpty({ message: 'Designation cannot be blank.' })
  @IsString({ message: 'Designation must be a string.' })
  designation: string;

  @IsNotEmpty({ message: 'Department cannot be blank.' })
  @IsString({ message: 'Department must be a string.' })
  department: string;

}
