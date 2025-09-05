import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './entity/meeting.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(@InjectRepository(Meeting) private repo: Repository<Meeting>) {}

  async create(dto: CreateMeetingDto, teacherId: string) {
    const meeting = this.repo.create({
      title: dto.title,
      description: dto.description,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      status: 'SCHEDULED',
      roomName: `room_${Date.now()}`,
      teacher: { id: teacherId } as any,
    });
    return this.repo.save(meeting);
  }

  async start(id: string, teacherId: string) {
    const meeting = await this.repo.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException();
    if (meeting.teacher.id !== teacherId) throw new ForbiddenException();
    meeting.status = 'LIVE';
    return this.repo.save(meeting);
  }

  async end(id: string, teacherId: string) {
    const meeting = await this.repo.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException();
    if (meeting.teacher.id !== teacherId) throw new ForbiddenException();
    meeting.status = 'ENDED';
    return this.repo.save(meeting);
  }

  async findVisible() {
    return this.repo.find({ where: [{ status: 'SCHEDULED' }, { status: 'LIVE' }] });
  }

  async findById(id: string) {
    const meeting = await this.repo.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException();
    return meeting;
  }
}
