import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProctoringAlert } from '../meetings/entities/proctoring-alert.entity';
import { MeetingSession } from '../meetings/entities/meeting-session.entity';
import { MeetingParticipant } from '../meetings/entities/meeting-participant.entity';

import { ProctoringService } from './proctoring.service';
import { ProctoringController } from './proctoring.controller';
import { LivekitModule } from '../livekit/livekit.module';
import { Meeting } from 'src/meetings/entity/meeting.entity';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProctoringAlert, MeetingSession, MeetingParticipant,Meeting,User]),
    LivekitModule
  ],
  providers: [ProctoringService],
  controllers: [ProctoringController],
  exports: [ProctoringService],
})
export class ProctoringModule {}