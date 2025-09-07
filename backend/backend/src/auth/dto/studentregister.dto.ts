import { Exclude } from 'class-transformer';
import { IsString, IsNotEmpty, IsEmail, MinLength,Matches } from 'class-validator';
import { UserRole } from '../../user/entities/user.entity';

export class StudentRegisterDto {
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


  @IsNotEmpty({message:"The student uid must not be blank"})
  @IsString({message:"The student uid must be a string"})
  studentUid:string;

  @IsNotEmpty({ message: 'Roll number cannot be blank.' })
  @IsString({ message: 'Roll number must be a string.' })
  rollNumber: string;

 

  @IsNotEmpty({ message: 'Institution cannot be blank.' })
  @IsString({ message: 'Institution must be a string.' })
  institutionName: string;


  @IsNotEmpty()
  @IsString()
  @Matches(/^https?:\/\/res\.cloudinary\.com\/.+$/, { message: 'Invalid Cloudinary URL' })
  profilePic: string;

  @IsNotEmpty()
  @IsString()
  publicId: string;

  

}
