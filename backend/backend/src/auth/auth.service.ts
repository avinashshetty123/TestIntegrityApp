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

  private async generateToken(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // store hashed refresh token in DB
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.userService.updateRefreshToken(user.id, hashedRefresh);

    return { accessToken, refreshToken };
  }

  // Student Registration with optional profilePic
  async registerStudent(
    dto: StudentRegisterDto,
    file?: Express.Multer.File,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);



    const user = await this.userService.create({
      ...dto,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.STUDENT,
      status:'active'

    });

    return this.generateToken(user);
  }

  // Tutor Registration with optional profilePic
  async registerTutor(
    dto: TutorRegisterDto,
    file?: Express.Multer.File,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

  

    const user = await this.userService.create({
      ...dto,
      password: hashedPassword,
      role: UserRole.TUTOR,
      status:'active'
   
    });

    return this.generateToken(user);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    return this.generateToken(user);
  }

  async googleLogin(profile: any): Promise<{ accessToken: string; refreshToken: string }> {
    let user = await this.userService.findByGoogleId(profile.id);
    if (!user) {
      user = await this.userService.create({
        googleId: profile.id,
        email: profile.email,
        fullName: profile.displayName,
         status: 'pending',   // 🔹 Mark as pending
         role: null,    // default role
      });
    }
    return this.generateToken(user);
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.userService.findById(userId);
    if (!user || !user.refreshToken) throw new UnauthorizedException('Access Denied');

    const refreshMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!refreshMatches) throw new UnauthorizedException('Invalid refresh token');

    return this.generateToken(user);
  }

  async logout(userId: number): Promise<void> {
    await this.userService.clearRefreshToken(userId);
  }
}
