import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from './entity/meeting.entity';
import { MeetingSession } from './entities/meeting-session.entity';
import { MeetingLockRequest } from './entities/meeting-lock-request.entity';
import { JoinRequest } from './entities/join-request.entity';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { LivekitModule } from '../livekit/livekit.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Meeting, MeetingSession, MeetingLockRequest, JoinRequest]), LivekitModule, UserModule],
  providers: [MeetingsService],
  controllers: [MeetingsController],
})
export class MeetingsModule {}
