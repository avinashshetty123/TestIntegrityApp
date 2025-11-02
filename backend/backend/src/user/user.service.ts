import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async findById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { googleId } });
  }

  // ✅ Save (hashed) refresh token in DB
  async updateRefreshToken(userId: number, refreshToken: string): Promise<void> {
    await this.userRepository.update(userId, { refreshToken });
  }

  // ✅ Clear refresh token (logout)
  async clearRefreshToken(userId: number): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: '' });
  }
async update(userId: string, data: Partial<User>): Promise<User> {
  const user = await this.userRepository.findOne({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const updated = this.userRepository.merge(user, data);
  return this.userRepository.save(updated);
}

async updateProfile(userId: string, profileData: any): Promise<User> {
  const user = await this.userRepository.findOne({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // Update fullName when firstName or lastName changes
  if (profileData.firstName || profileData.lastName) {
    const firstName = profileData.firstName || user.firstName || '';
    const lastName = profileData.lastName || user.lastName || '';
    profileData.fullName = `${firstName} ${lastName}`.trim();
  }

  const updated = this.userRepository.merge(user, profileData);
  return this.userRepository.save(updated);
}

}
