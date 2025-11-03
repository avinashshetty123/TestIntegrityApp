import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Meeting } from './entity/meeting.entity';
import { MeetingSession } from './entities/meeting-session.entity';
import { MeetingLockRequest } from './entities/meeting-lock-request.entity';
import { JoinRequest } from './entities/join-request.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { CreateMeetingSessionDto, UpdateMeetingSessionDto, CreateLockRequestDto, RespondToLockRequestDto } from './dto/meeting-session.dto';
import { UserService } from 'src/user/user.service';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting) private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(MeetingSession) private readonly sessionRepo: Repository<MeetingSession>,
    @InjectRepository(MeetingLockRequest) private readonly lockRequestRepo: Repository<MeetingLockRequest>,
    @InjectRepository(JoinRequest) private readonly joinRequestRepo: Repository<JoinRequest>,
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
    isPublished: false,
    requireApproval: true
  });

  return this.meetingRepo.save(meeting);
}

async start(id: string, teacherId: string) {
  const meeting = await this.meetingRepo.findOne({ where: { id } });
  if (!meeting) throw new NotFoundException('Meeting not found');
  
  if (meeting.teacherId !== teacherId) {
    const teacher = await this.userservice.findById(teacherId);
    if (teacher && teacher.role === 'tutor' && meeting.teacherId === teacherId) {
      // Tutor starting their own meeting
    } else {
      // Auto-start for students joining
    }
  }

  meeting.status = 'LIVE';
  meeting.startedAt = new Date();
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
  meeting.endedAt = new Date();
  
  await this.sessionRepo.update(
    { meetingId: id, leftAt: IsNull() },
    { leftAt: new Date() }
  );
  
  return this.meetingRepo.save(meeting);
}

  async createSession(dto: CreateMeetingSessionDto): Promise<MeetingSession> {
    const session = this.sessionRepo.create(dto);
    return this.sessionRepo.save(session);
  }

  async endSession(sessionId: string): Promise<MeetingSession> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    session.leftAt = new Date();
    return this.sessionRepo.save(session);
  }

  async updateSession(sessionId: string, dto: UpdateMeetingSessionDto): Promise<MeetingSession | null> {
    await this.sessionRepo.update(sessionId, dto);
    return this.sessionRepo.findOne({ where: { id: sessionId } });
  }

  async getMeetingResults(meetingId: string) {
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId }, relations: ['teacher'] });
    if (!meeting) throw new NotFoundException('Meeting not found');
    
    const sessions = await this.sessionRepo.find({
      where: { meetingId },
      order: { joinedAt: 'ASC' }
    });

    return {
      meeting,
      sessions,
      summary: {
        totalParticipants: sessions.length,
        totalAlerts: sessions.reduce((sum, s) => sum + s.totalAlerts, 0),
        flaggedParticipants: sessions.filter(s => s.flagged).length,
        duration: meeting.endedAt && meeting.startedAt 
          ? Math.round((meeting.endedAt.getTime() - meeting.startedAt.getTime()) / 60000)
          : null
      }
    };
  }

  async createLockRequest(dto: CreateLockRequestDto): Promise<MeetingLockRequest> {
    const request = this.lockRequestRepo.create(dto);
    return this.lockRequestRepo.save(request);
  }

  async respondToLockRequest(requestId: string, dto: RespondToLockRequestDto): Promise<MeetingLockRequest> {
    const request = await this.lockRequestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Lock request not found');
    
    request.status = dto.status;
    request.tutorResponse = dto.tutorResponse;
    request.respondedAt = new Date();
    
    if (dto.status === 'APPROVED') {
      await this.lockMeeting(request.meetingId);
    }
    
    return this.lockRequestRepo.save(request);
  }

  async lockMeeting(meetingId: string): Promise<Meeting> {
    const meeting = await this.findById(meetingId);
    meeting.isLocked = true;
    return this.meetingRepo.save(meeting);
  }

  async unlockMeeting(meetingId: string): Promise<Meeting> {
    const meeting = await this.findById(meetingId);
    meeting.isLocked = false;
    return this.meetingRepo.save(meeting);
  }

  async getPendingLockRequests(meetingId: string): Promise<MeetingLockRequest[]> {
    return this.lockRequestRepo.find({
      where: { meetingId, status: 'PENDING' },
      order: { requestedAt: 'DESC' }
    });
  }

  async getActiveSessions(meetingId: string): Promise<MeetingSession[]> {
    return this.sessionRepo.find({
      where: { meetingId, leftAt: IsNull() },
      order: { joinedAt: 'ASC' }
    });
  }

  async findVisible() {
    return this.meetingRepo.find({
      where: [{ status: 'SCHEDULED' }, { status: 'LIVE' }],
    });
  }

  async findVisibleForStudents(studentInstitution?: string) {
    const queryBuilder = this.meetingRepo.createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.teacher', 'teacher')
      .where('meeting.status IN (:...statuses)', { statuses: ['SCHEDULED', 'LIVE'] })
      .andWhere('meeting.isPublished = :published', { published: true });
    
    if (studentInstitution) {
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
    const meetings = await this.meetingRepo.find({
      where: [{ status: 'SCHEDULED' }, { status: 'LIVE' }],
    });
    
    return meetings.find(meeting => {
      const code = meeting.roomName?.replace('room_', '').substring(0, 6).toUpperCase() || 
                   meeting.id.substring(0, 6).toUpperCase();
      return code === joinCode.toUpperCase();
    });
  }

  async publishMeeting(meetingId: string, teacherId: string) {
    const meeting = await this.findById(meetingId);
    if (meeting.teacherId !== teacherId) throw new ForbiddenException('Not your meeting');
    meeting.isPublished = true;
    return this.meetingRepo.save(meeting);
  }

  async createJoinRequest(meetingId: string, studentId: string, studentName: string) {
    const request = this.joinRequestRepo.create({
      meetingId,
      studentId,
      studentName
    });
    return this.joinRequestRepo.save(request);
  }

  async respondToJoinRequest(requestId: string, status: 'APPROVED' | 'REJECTED') {
    const request = await this.joinRequestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Join request not found');
    
    request.status = status;
    request.respondedAt = new Date();
    return this.joinRequestRepo.save(request);
  }

  async getPendingJoinRequests(meetingId: string) {
    return this.joinRequestRepo.find({
      where: { meetingId, status: 'PENDING' },
      order: { requestedAt: 'DESC' }
    });
  }

  async delete(id: string, teacherId: string) {
    const meeting = await this.meetingRepo.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.teacherId !== teacherId) throw new ForbiddenException('Not your meeting');

    // Use raw SQL to bypass TypeORM foreign key issues
    await this.meetingRepo.query('DELETE FROM meeting_sessions WHERE "meetingId" = $1', [id]);
    await this.meetingRepo.query('DELETE FROM meeting_lock_requests WHERE "meetingId" = $1', [id]);
    await this.meetingRepo.query('DELETE FROM join_requests WHERE "meetingId" = $1', [id]);
    await this.meetingRepo.query('DELETE FROM meetings WHERE id = $1', [id]);
    
    return { message: 'Meeting deleted successfully' };
  }
}