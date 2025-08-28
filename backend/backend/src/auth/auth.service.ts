import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { StudentRegisterDto } from './dto/studentregister.dto';
import { TutorRegisterDto } from './dto/tutorregister.dto';
import { UserRole } from 'src/user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  // Generate JWT tokens
  private async generateToken(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  // Student Registration
  async registerStudent(dto: StudentRegisterDto): Promise<{ accessToken: string; refreshToken: string }> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userService.create({
      email: dto.email,
      password: hashedPassword,
      role: UserRole.STUDENT,
      // Add other fields from dto if needed
    });
    return this.generateToken(user);
  }

  // Tutor Registration
  async registerTutor(dto: TutorRegisterDto): Promise<{ accessToken: string; refreshToken: string }> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userService.create({
      ...dto,
      password: hashedPassword,
      role: UserRole.TUTOR,
    });
    return this.generateToken(user);
  }

  // Login with email + password
  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    return this.generateToken(user);
  }

  // Google login
  async googleLogin(profile: any): Promise<{ accessToken: string; refreshToken: string }> {
    let user = await this.userService.findByGoogleId(profile.id);
    if (!user) {
      user = await this.userService.create({
        googleId: profile.id,
        email: profile.email,
        fullName: profile.displayName,
       
        role: UserRole.TUTOR, // default role
      });
    }
    return this.generateToken(user);
  }
}
