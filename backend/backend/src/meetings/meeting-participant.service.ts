import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingParticipant } from './entities/meeting-participant.entity';

@Injectable()
export class MeetingParticipantService {
  constructor(
    @InjectRepository(MeetingParticipant)
    private readonly participantRepo: Repository<MeetingParticipant>,
  ) {}

  async joinMeeting(meetingId: string, userId: string) {
    let participant = await this.participantRepo.findOne({
      where: { meetingId, userId },
    });

    if (!participant) {
      participant = this.participantRepo.create({
        meetingId,
        userId,
        status: 'JOINED',
        joinedAt: new Date(),
      });
    } else {
      participant.status = 'JOINED';
      participant.joinedAt = new Date();
    }

    return this.participantRepo.save(participant);
  }

  async leaveMeeting(meetingId: string, userId: string) {
    const participant = await this.participantRepo.findOne({
      where: { meetingId, userId, status: 'JOINED' },
    });

    if (participant) {
      participant.status = 'LEFT';
      participant.leftAt = new Date();
      
      if (participant.joinedAt) {
        participant.totalDuration = Math.floor(
          (new Date().getTime() - participant.joinedAt.getTime()) / 1000
        );
      }

      return this.participantRepo.save(participant);
    }
  }

  async getMeetingParticipants(meetingId: string) {
    return this.participantRepo.find({
      where: { meetingId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  async getParticipantSummary(meetingId: string) {
    const participants = await this.getMeetingParticipants(meetingId);
    
    return {
      total: participants.length,
      joined: participants.filter(p => p.status === 'JOINED').length,
      left: participants.filter(p => p.status === 'LEFT').length,
      participants: participants.map(p => ({
        id: p.id,
        userId: p.userId,
        name: p.user.fullName,
        email: p.user.email,
        status: p.status,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        duration: p.totalDuration,
      })),
    };
  }
}