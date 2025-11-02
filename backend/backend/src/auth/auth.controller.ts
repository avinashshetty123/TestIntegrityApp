import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { StudentRegisterDto } from './dto/studentregister.dto';
import { TutorRegisterDto } from './dto/tutorregister.dto';
import { AuthGuard } from '@nestjs/passport';
import { CompleteProfileDto } from './dto/completeprofile.dto';
import type { Response } from 'express';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax', // in prod, you may want 'none' + secure
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000, // 15 minutes
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  @Post('register/student')
  async registerStudent(@Body() dto: StudentRegisterDto, @Res() res: Response) {
    const tokens = await this.authService.registerStudent(dto);
    this.setAuthCookies(res, tokens);
    return res.json({ 
      role: 'student',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  }

  @Post('register/tutor')
  async registerTutor(@Body() dto: TutorRegisterDto, @Res() res: Response) {
    const tokens = await this.authService.registerTutor(dto);
    this.setAuthCookies(res, tokens);
    return res.json({ 
      role: 'tutor',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const tokens = await this.authService.login(dto);

    // decode role from JWT payload if needed
    const payload = JSON.parse(
      Buffer.from(tokens.accessToken.split('.')[1], 'base64').toString(),
    );

    this.setAuthCookies(res, tokens);
    return res.json({ 
      role: payload.role, 
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken 
    });
  }

  // Google OAuth redirect
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const profile = req.user.profile;
    const { user, tokens } = await this.authService.handleOAuthLogin(profile);

    this.setAuthCookies(res, tokens);

    const redirectPath =
      user.status === 'pending'
        ? '/complete-profile'
        : user.role === 'tutor'
        ? '/tutor'
        : '/student';

    return res.redirect(`${FRONTEND_URL}${redirectPath}`);
  }

  @Post('complete-profile')
  async completeProfile(@Body() dto: CompleteProfileDto, @Req() req, @Res() res: Response) {
    const tokens = await this.authService.completeProfile(req.user.id, dto);

    const payload = JSON.parse(
      Buffer.from(tokens.accessToken.split('.')[1], 'base64').toString(),
    );

    this.setAuthCookies(res, tokens);
    return res.json({ role: payload.role });
  }
}
