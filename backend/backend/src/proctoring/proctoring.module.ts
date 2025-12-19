import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProctoringService } from './proctoring.service';
import { ProctoringController } from './proctoring.controller';
import { ProctoringAlert } from './entities/proctoring-alert.entity';
import { ProctoringSession } from './entities/proctoring-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProctoringAlert, ProctoringSession])
  ],
  controllers: [ProctoringController],
  providers: [ProctoringService],
  exports: [ProctoringService]
})
export class ProctoringModule {}