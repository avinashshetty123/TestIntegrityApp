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
    public userservice: UserService
  ) {}

async create(dto: CreateMeetingDto, teacherId: string) {
  const teacher = await this.userservice.findById(teacherId);
  if (!teacher) throw new NotFoundException('User not found');

  if (teacher.role !== 'tutor') {
    throw new ForbiddenException('Only teachers can create meetings');
  }

  const meeting = this.meetingRepo.create({
    title: dto.title,
    description: dto.description,
    institution: dto.institution || teacher.institutionName,
    subject: dto.subject,
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
  
  // Allow auto-start for any user joining
  if (meeting.teacherId !== teacherId) {
    // Check if user is tutor for this meeting or allow auto-start
    const teacher = await this.userservice.findById(teacherId);
    if (teacher && teacher.role === 'tutor' && meeting.teacherId === teacherId) {
      // Tutor starting their own meeting
    } else {
      // Auto-start for students joining
    }
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

  async findVisibleForStudents(studentInstitution?: string) {
    const queryBuilder = this.meetingRepo.createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.teacher', 'teacher')
      .where('meeting.status IN (:...statuses)', { statuses: ['SCHEDULED', 'LIVE'] });
    
    if (studentInstitution) {
      // Prioritize same institution meetings first
      queryBuilder.orderBy(
        `CASE WHEN meeting.institution = :institution THEN 0 ELSE 1 END`,
        'ASC'
      ).setParameter('institution', studentInstitution);
    }
    
    queryBuilder.addOrderBy('meeting.scheduledAt', 'ASC');
    
    return queryBuilder.getMany();
  }

  async findByTutor(tutorId: string) {
    return this.meetingRepo.find({
      where: { teacherId: tutorId },
      relations: ['teacher']
    });
  }

  async searchMeetings(query: string, userRole: string, userId: string) {
    const queryBuilder = this.meetingRepo.createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.teacher', 'teacher')
      .where('meeting.status IN (:...statuses)', { statuses: ['SCHEDULED', 'LIVE'] })
      .andWhere(
        '(meeting.title ILIKE :query OR meeting.description ILIKE :query OR teacher.firstName ILIKE :query OR teacher.lastName ILIKE :query)',
        { query: `%${query}%` }
      );

    if (userRole === 'tutor') {
      queryBuilder.andWhere('meeting.teacherId = :userId', { userId });
    }

    return queryBuilder.getMany();
  }

  async findByInstitution(institution: string) {
    return this.meetingRepo.createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.teacher', 'teacher')
      .where('meeting.status IN (:...statuses)', { statuses: ['SCHEDULED', 'LIVE'] })
      .andWhere('meeting.description ILIKE :institution', { institution: `%${institution}%` })
      .getMany();
  }

  async findById(id: string) {
    const meeting = await this.meetingRepo.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  async findByJoinCode(joinCode: string) {
    // Join code is derived from roomName or meeting ID
    const meetings = await this.meetingRepo.find({
      where: [{ status: 'SCHEDULED' }, { status: 'LIVE' }],
    });
    
    return meetings.find(meeting => {
      const code = meeting.roomName?.replace('room_', '').substring(0, 6).toUpperCase() || 
                   meeting.id.substring(0, 6).toUpperCase();
      return code === joinCode.toUpperCase();
    });
  }

  async delete(id: string, teacherId: string) {
    const meeting = await this.meetingRepo.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.teacherId !== teacherId) throw new ForbiddenException('Not your meeting');

    await this.meetingRepo.remove(meeting);
    return { message: 'Meeting deleted successfully' };
  }
}
