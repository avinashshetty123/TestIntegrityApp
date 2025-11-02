import { Controller, Get, Param, Put, Body, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UserService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) return { message: 'User not found' };
    return user;
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) return { message: 'User not found' };
    return user;
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req, @Body() updateData: any) {
    return this.usersService.updateProfile(req.user.userId, updateData);
  }
}
