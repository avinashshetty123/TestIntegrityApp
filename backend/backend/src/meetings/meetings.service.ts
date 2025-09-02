import { ForbiddenException, Injectable, NotFoundException, UseGuards } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Meeting } from "./entity/meeting.entity";
import { Repository } from "typeorm";
import { CreateMeetingDto } from "./dto/create-meeting.dto";
import { Roles } from "src/auth/decorator/roles.decorator";
import { NotFoundError } from "rxjs";
import { MeetingStatus } from "./entity/meeting.entity";
@Injectable()
export class MeetingService{
    constructor(@InjectRepository(Meeting)private repo:Repository<Meeting>){}
    @UseGuards(Roles)
    async create(dto:CreateMeetingDto,teacherId:string){
        const meeting =this.repo.create({
             title: dto.title,
      description: dto.description,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      status: 'SCHEDULED',
      roomName: `room_${Date.now()}`,
      teacher: { id: teacherId } as any,
        }
        )
        return this.repo.save(meeting);

        
    }
    async start(id:string,teacherId:number){
        const meeting=await this.repo.findOne({where:{id}})
        if(!meeting)throw new NotFoundException();
        if(meeting.teacher.id!==teacherId)throw new ForbiddenException();
        meeting.status=MeetingStatus.LIVE;
        return this.repo.save(meeting);

    }
}