import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './entity/meeting.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UserService } from 'src/user/user.service';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting) private readonly meetingRepo: Repository<Meeting>,
  private userservice:UserService
  ) {}

async create(dto: CreateMeetingDto, teacherId: string) {
  const teacher = await this.userservice.findById(teacherId);
  if (!teacher) throw new NotFoundException('User not found');

  // ✅ Ensure only tutors/teachers can create meetings
  if (teacher.role !== 'tutor') {
    throw new ForbiddenException('Only teachers can create meetings');
  }

  const meeting = this.meetingRepo.create({
    title: dto.title,
    description: dto.description,
    scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    status: 'SCHEDULED',
    roomName: `room_${Date.now()}`,
    teacher,
    teacherId,
  });

  return this.meetingRepo.save(meeting);
}

async start(id: string, teacherId: string) {
  const meeting = await this.meetingRepo.findOne({ where: { id } });
  if (!meeting) throw new NotFoundException('Meeting not found');
  if (meeting.teacherId !== teacherId) throw new ForbiddenException('Not your meeting');

  const teacher = await this.userservice.findById(teacherId);
  if (!teacher || teacher.role !== 'tutor') {
    throw new ForbiddenException('Only teachers can start meetings');
  }

  meeting.status = 'LIVE';
  return this.meetingRepo.save(meeting);
}

async end(id: string, teacherId: string) {
  const meeting = await this.meetingRepo.findOne({ where: { id } });
  if (!meeting) throw new NotFoundException('Meeting not found');
  if (meeting.teacherId !== teacherId) throw new ForbiddenException('Not your meeting');

  const teacher = await this.userservice.findById(teacherId);
  if (!teacher || teacher.role !== 'tutor') {
    throw new ForbiddenException('Only teachers can end meetings');
  }

  meeting.status = 'ENDED';
  return this.meetingRepo.save(meeting);
}


  async findVisible() {
    return this.meetingRepo.find({
      where: [{ status: 'SCHEDULED' }, { status: 'LIVE' }],
    });
  }

  async findById(id: string) {
    const meeting = await this.meetingRepo.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }
}
