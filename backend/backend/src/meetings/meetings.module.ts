import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from './entity/meeting.entity';
import { MeetingSession } from './entities/meeting-session.entity';
import { JoinRequest } from './entities/join-request.entity';
// import { Test } from './entities/test.entity';
import { MeetingParticipant } from './entities/meeting-participant.entity';
import { ProctoringAlert } from './entities/proctoring-alert.entity';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { MeetingParticipantService } from './meeting-participant.service';
import { LivekitModule } from '../livekit/livekit.module';
import { UserModule } from 'src/user/user.module';
import { ProctoringModule } from '../proctoring/proctoring.module';
import { MeetingGateway } from './meeting.gateway';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Meeting, 
      MeetingSession, 
      JoinRequest, 
      // Test, 
      MeetingParticipant,
      ProctoringAlert
    ]), 
    LivekitModule, 
    UserModule,
    ProctoringModule
  ],
  providers: [MeetingsService, MeetingParticipantService,MeetingGateway],
  controllers: [MeetingsController],
  exports: [MeetingsService, MeetingParticipantService],
})
export class MeetingsModule {}
