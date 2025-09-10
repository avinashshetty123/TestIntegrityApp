import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { StudentRegisterDto } from './dto/studentregister.dto';
import { TutorRegisterDto } from './dto/tutorregister.dto';
import { AuthGuard } from '@nestjs/passport';
import { CompleteProfileDto } from './dto/completeprofile.dto';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/student')

  async registerStudent(
    @Body() dto: StudentRegisterDto,
    
  ) {
    return this.authService.registerStudent(dto);
  }

  @Post('register/tutor')

  async registerTutor(
    @Body() dto: TutorRegisterDto,
 
  ) {
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
  async googleCallback(@Req() req: any, @Res() res: Response) {
    // req.user contains { profile, accessToken, refreshToken } returned from strategy
    const profile = req.user.profile;
    const { user, tokens } = await this.authService.handleOAuthLogin(profile);

    // Option A (recommended): set HttpOnly cookies and redirect
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',     // in prod consider 'none' + secure
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Decide redirect path
    const redirectPath =
      user.status === 'pending'
        ? '/complete-profile'
        : user.role === 'tutor'
        ? '/tutor'
        : '/student';

    return res.redirect(`${FRONTEND_URL}${redirectPath}`);
  }
  @Post('auth/complete-profile')
async completeProfile(@Body() dto: CompleteProfileDto, @Req() req) {
  return this.authService.completeProfile(req.user.id, dto);
}
}
