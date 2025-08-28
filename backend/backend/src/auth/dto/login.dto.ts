import { MaxLength, MinLength } from "class-validator";
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Username cannot be blank.' })
  @IsString({ message: 'Username must be a string.' })
  @MinLength(3, { message: 'Username must be at least 3 characters long.' })
  @MaxLength(50, { message: 'Username cannot be more than 50 characters long.' })
  email: string;
  

  @IsNotEmpty({ message: 'Password cannot be blank.' })
  @IsString({ message: 'Password must be a string.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;
}
