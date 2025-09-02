import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { StudentRegisterDto } from './dto/studentregister.dto';
import { TutorRegisterDto } from './dto/tutorregister.dto';
import { AuthGuard } from '@nestjs/passport';



@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/student')

  async registerStudent(
    @Body() dto: StudentRegisterDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.authService.registerStudent(dto, file);
  }

  @Post('register/tutor')

  async registerTutor(
    @Body() dto: TutorRegisterDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.authService.registerTutor(dto, file);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Redirect to Google login
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // passport will handle redirect
  }

  // Callback after Google login
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req) {
    return this.authService.googleLogin(req.user);
  }
}
