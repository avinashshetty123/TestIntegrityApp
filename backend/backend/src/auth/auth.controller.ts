import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { StudentRegisterDto } from './dto/studentregister.dto';
import { TutorRegisterDto } from './dto/tutorregister.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('student/register')
  async registerStudent(@Body() dto: StudentRegisterDto) {
    return this.authService.registerStudent(dto);
  }

  @Post('tutor/register')
  async registerTutor(@Body() dto: TutorRegisterDto) {
    return this.authService.registerTutor(dto);
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
