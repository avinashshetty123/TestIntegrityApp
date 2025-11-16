import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Meeting } from './entity/meeting.entity';
import { MeetingSession } from './entities/meeting-session.entity';
import { JoinRequest } from './entities/join-request.entity';

import { CreateMeetingDto } from './dto/create-meeting.dto';
import {
  CreateMeetingSessionDto,
  UpdateMeetingSessionDto,
} from './dto/meeting-session.dto';
import { UserService } from 'src/user/user.service';
import { KickParticipantDto } from './dto/kick-participant.dto';
import {MeetingGateway} from './meeting.gateway'
@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting) private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(MeetingSession) private readonly sessionRepo: Repository<MeetingSession>,
    @InjectRepository(JoinRequest) private readonly joinRequestRepo: Repository<JoinRequest>,
    // @InjectRepository(Test) private readonly testRepo: Repository<Test>,
    public userservice: UserService,
    public meetinggateway:MeetingGateway,
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

    if(meeting.teacherId != teacherId) {
      throw new ForbiddenException('Not your meeting');
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

    // End all active sessions (leftAt IS NULL)
    await this.sessionRepo.update({ meetingId: id, leftAt: IsNull() }, { leftAt: new Date() });

    return this.meetingRepo.save(meeting);
  }

  async findVisible() {
    return this.meetingRepo.find({
      where: [{ status: 'SCHEDULED' }, { status: 'LIVE' }],
    });
  }

  async findVisibleForStudents(studentInstitution?: string) {
    const queryBuilder = this.meetingRepo
      .createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.teacher', 'teacher')
      .where('meeting.status IN (:...statuses)', { statuses: ['SCHEDULED', 'LIVE'] });

    if (studentInstitution) {
      queryBuilder
        .orderBy(`CASE WHEN meeting.institution = :institution THEN 0 ELSE 1 END`, 'ASC')
        .setParameter('institution', studentInstitution);
    }

    queryBuilder.addOrderBy('meeting.scheduledAt', 'ASC');

    return queryBuilder.getMany();
  }

  async findByTutor(tutorId: string) {
    return this.meetingRepo.find({
      where: { teacherId: tutorId },
      relations: ['teacher'],
    });
  }

  async searchMeetings(query: string, userRole: string, userId: string) {
    const queryBuilder = this.meetingRepo
      .createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.teacher', 'teacher')
      .where('meeting.status IN (:...statuses)', { statuses: ['SCHEDULED', 'LIVE'] })
      .andWhere(
        '(meeting.title ILIKE :query OR meeting.description ILIKE :query OR teacher.firstName ILIKE :query OR teacher.lastName ILIKE :query)',
        { query: `%${query}%` },
      );

    if (userRole === 'tutor') {
      queryBuilder.andWhere('meeting.teacherId = :userId', { userId });
    }

    return queryBuilder.getMany();
  }

  async findByInstitution(institution: string) {
    return this.meetingRepo
      .createQueryBuilder('meeting')
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

    return meetings.find((meeting) => {
      const code =
        meeting.roomName?.replace('room_', '').substring(0, 6).toUpperCase() ||
        meeting.id.substring(0, 6).toUpperCase();
      return code === joinCode.toUpperCase();
    });
  }

  // Session management
  async createSession(dto: CreateMeetingSessionDto): Promise<MeetingSession> {
    const session = this.sessionRepo.create(dto);
    return this.sessionRepo.save(session);
  }

  async endSession(sessionId: string): Promise<MeetingSession> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    if (!session.leftAt) {
      session.leftAt = new Date();
    }

    return this.sessionRepo.save(session);
  }

  async updateSession(sessionId: string, dto: UpdateMeetingSessionDto): Promise<MeetingSession> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    Object.assign(session, dto);
    return this.sessionRepo.save(session);
  }

  async getMeetingResults(meetingId: string) {
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId }, relations: ['teacher'] });
    if (!meeting) throw new NotFoundException('Meeting not found');

    const sessions = await this.sessionRepo.find({
      where: { meetingId },
      order: { joinedAt: 'ASC' },
    });

    return {
      meeting,
      sessions,
      summary: {
        totalParticipants: sessions.length,
        totalAlerts: sessions.reduce((sum, s) => sum + (s.totalAlerts || 0), 0),
        flaggedParticipants: sessions.filter((s) => !!s.flagged).length,
        duration:
          meeting.endedAt && meeting.startedAt
            ? Math.round((meeting.endedAt.getTime() - meeting.startedAt.getTime()) / 60000)
            : null,
      },
    };
  }



  async lockMeeting(meetingId: string): Promise<Meeting> {
    const meeting = await this.findById(meetingId);
    if(!meeting){
      throw new ForbiddenException('No meeting');
    }
    meeting.isLocked = true;
    meeting.requireApproval=true;
    return this.meetingRepo.save(meeting);
  }

  async unlockMeeting(meetingId: string): Promise<Meeting> {
    const meeting = await this.findById(meetingId);
    meeting.isLocked = false;
      meeting.requireApproval=false;
    return this.meetingRepo.save(meeting);
  }



  // Active sessions (leftAt IS NULL)
  async getActiveSessions(meetingId: string): Promise<MeetingSession[]> {
    return this.sessionRepo.find({
      where: { meetingId, leftAt: IsNull() },
      order: { joinedAt: 'ASC' },
    });
  }

  async delete(id: string, teacherId: string) {
    const meeting = await this.meetingRepo.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.teacherId !== teacherId) throw new ForbiddenException('Not your meeting');

    await this.meetingRepo.remove(meeting);
    return { message: 'Meeting deleted successfully' };
  }

  // Join Request Management
  async createJoinRequest(meetingId: string, studentId: string, studentName: string) {
    const existing = await this.joinRequestRepo.findOne({
      where: { meetingId, studentId, status: 'PENDING' },
    });

    if (existing&&existing.status=='PENDING') {
      return existing;
    }


    const request = this.joinRequestRepo.create({
      meetingId,
      studentId,
      studentName,
      status: 'PENDING',
    });

    return this.joinRequestRepo.save(request);
  }

  async getPendingJoinRequests(meetingId: string) {
    const result= await this.joinRequestRepo.find({
      where: { meetingId, status: 'PENDING' },
      order: { requestedAt: 'DESC' },
    });
    console.log(result);
    return result;

  }

  async respondToJoinRequest(requestId: string, status: 'APPROVED' | 'REJECTED') {
    const request = await this.joinRequestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Join request not found');

    request.status = status;
    request.respondedAt = new Date();
  const saved = await this.joinRequestRepo.save(request);

 this.meetinggateway.handleApproveJoinRequest({
  requestId: request.id,
  studentId: request.studentId,
  meetingId: request.meetingId
});

  return {
    ...saved,
    studentId: request.studentId,
    meetingId: request.meetingId,
  };
  }

  async canStudentJoin(meetingId: string, studentId: string): Promise<boolean> {
    const meeting = await this.findById(meetingId);

    if (!meeting.requireApproval) return true;

    const approvedRequest = await this.joinRequestRepo.findOne({
      where: { meetingId, studentId, status: 'APPROVED' },
    });

    return !!approvedRequest;
  }




  async kickParticipant(dto: KickParticipantDto) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: dto.meetingId }
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.teacherId !== dto.tutorId) {
      throw new ForbiddenException('Only the meeting organizer can kick participants');
    }

    const session = await this.sessionRepo.findOne({
      where: {
        meetingId: dto.meetingId,
        participantId: dto.studentId,
        leftAt: IsNull()
      },
    });

    if (!session) {
      throw new NotFoundException('Participant not found in active session');
    }

    session.leftAt = new Date();
    session.kicked = true;
    await this.sessionRepo.save(session);

    return { 
      message: 'Participant has been kicked from the meeting', 
      participantId: dto.studentId,
      participantName: session.participantName,
      kickedAt: session.leftAt
    };
  }



}