import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { StudentRegisterDto } from './dto/studentregister.dto';
import { TutorRegisterDto } from './dto/tutorregister.dto';
import { UserRole } from 'src/user/entities/user.entity';
import { CompleteProfileDto } from './dto/completeprofile.dto';
import { NotFoundException } from '@nestjs/common';
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  private async generateToken(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      // store hashed refresh token in DB
      const hashedRefresh = await bcrypt.hash(refreshToken, 10);
      await this.userService.updateRefreshToken(user.id, hashedRefresh);

      return { accessToken, refreshToken };
    } catch (err) {
      throw new InternalServerErrorException('Token generation failed');
    }
  }

  // Student Registration
  async registerStudent(
    dto: StudentRegisterDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const existing = await this.userService.findByEmail(dto.email);
      if (existing) throw new BadRequestException('Email already in use');

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const user = await this.userService.create({
        ...dto,
        password: hashedPassword,
        role: UserRole.STUDENT,
        status: 'active',
      });

      return this.generateToken(user);
    } catch (err) {
      console.log(err);
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Student registration failed');
    }
  }

  // Tutor Registration
  async registerTutor(
    dto: TutorRegisterDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const existing = await this.userService.findByEmail(dto.email);
      if (existing) throw new BadRequestException('Email already in use');

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const user = await this.userService.create({
        ...dto,
        password: hashedPassword,
        role: UserRole.TUTOR,
        status: 'active',
      });

      return this.generateToken(user);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Tutor registration failed');
    }
  }

  // Login
  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const user = await this.userService.findByEmail(dto.email);
      if (!user) throw new UnauthorizedException('Invalid credentials');

      const isValid = await bcrypt.compare(dto.password, user.password);
      if (!isValid) throw new UnauthorizedException('Invalid credentials');

      return this.generateToken(user);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new InternalServerErrorException('Login failed');
    }
  }

  // Google login
  async googleLogin(profile: any): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      let user = await this.userService.findByGoogleId(profile.id);
      if (!user) {
        user = await this.userService.create({
          googleId: profile.id,
          email: profile.email,
          fullName: profile.displayName,
          status: 'pending', // must complete registration
          role: null,
        });
      }
      return this.generateToken(user);
    } catch {
      throw new InternalServerErrorException('Google login failed');
    }
  }
async completeProfile(userId: string, dto: CompleteProfileDto) {
  const user = await this.userService.findById(userId);
  if (!user) throw new NotFoundException('User not found');
  if (user.status === 'active') {
    throw new BadRequestException('Profile already completed');
  }

  await this.userService.update(userId, {
    ...dto,
    status: 'active',
  });

  const updated = await this.userService.findById(userId);
  return this.generateToken(updated); // new token with correct role
}

  // Refresh
  async refreshTokens(userId: string, refreshToken: string) {
    try {
      const user = await this.userService.findById(userId);
      if (!user || !user.refreshToken) throw new UnauthorizedException('Access Denied');

      const refreshMatches = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!refreshMatches) throw new UnauthorizedException('Invalid refresh token');

      return this.generateToken(user);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new InternalServerErrorException('Token refresh failed');
    }
  }

  // Logout
  async logout(userId: number): Promise<void> {
    try {
      await this.userService.clearRefreshToken(userId);
    } catch {
      throw new InternalServerErrorException('Logout failed');
    }
  }
  // auth.service.ts (excerpt)
async handleOAuthLogin(profile: any) {
  // profile.id, profile.emails[0].value
  let user = await this.userService.findByGoogleId(profile.id);
  if (!user) {
    user = await this.userService.create({
      googleId: profile.id,
      email: profile.emails?.[0]?.value,
      fullName: profile.displayName || 'Unknown',
      status: 'pending',
      role: null,
    });
  }
  const tokens = await this.generateToken(user); // your JWTs
  return { user, tokens };
}

}
