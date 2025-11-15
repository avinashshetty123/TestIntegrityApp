import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { DeepfakeController } from "./deepfake..controller";
import { DeepfakeService } from "./deepfake.service";
import { MeetingSession } from "src/meetings/entities/meeting-session.entity";
import { ProctoringAlert } from "src/meetings/entities/proctoring-alert.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
@Module({
    imports:[
        TypeOrmModule.forFeature([
            MeetingSession,
            ProctoringAlert
        ]),
        MulterModule.register({
            dest:'./uploads',
        }),
    ],
    controllers:[DeepfakeController],
    providers:[DeepfakeService]
})
export class DeepfakeModule{};