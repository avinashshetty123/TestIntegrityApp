import { MaxLength, MinLength } from "class-validator";
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'email cannot be blank.' })
  @IsString({ message: 'email must be a string.' })
  @MinLength(3, { message: 'email must be at least 3 characters long.' })
  @MaxLength(50, { message: 'email cannot be more than 50 characters long.' })
  email: string;
  

  @IsNotEmpty({ message: 'Password cannot be blank.' })
  @IsString({ message: 'Password must be a string.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;
}
