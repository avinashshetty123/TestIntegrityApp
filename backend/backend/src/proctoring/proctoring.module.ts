import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProctoringController } from './proctoring.controller';
import { ProctoringService } from './proctoring.service';
import { ProctoringAlert } from './entities/proctoring-alert.entity';
import { FaceVerification } from './entities/face-verification.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProctoringAlert, FaceVerification]),
    CloudinaryModule,
  ],
  controllers: [ProctoringController],
  providers: [ProctoringService],
  exports: [ProctoringService],
})
export class ProctoringModule {}