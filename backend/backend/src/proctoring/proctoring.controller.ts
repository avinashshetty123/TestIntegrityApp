import { Controller, Post, Get, Body, Param, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProctoringService } from './proctoring.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { VerifyFaceDto } from './dto/verify-face.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('proctoring')
@UseGuards(JwtAuthGuard)
export class ProctoringController {
  constructor(private proctoringService: ProctoringService) {}

  @Post('alert')
  async createAlert(@Body() dto: CreateAlertDto) {
    return this.proctoringService.createAlert(dto);
  }

  @Post('verify-face')
  @UseInterceptors(FileInterceptor('image'))
  async verifyFace(
    @Body() dto: VerifyFaceDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return this.proctoringService.verifyFace(dto, image);
  }

  @Post('yolo-detection')
  async processYoloDetection(
    @Body() body: { meetingId: string; studentId: string; detections: any[] },
  ) {
    return this.proctoringService.processYoloDetection(
      body.meetingId,
      body.studentId,
      body.detections,
    );
  }

  @Get('alerts/:meetingId')
  async getAlertsForMeeting(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getAlertsForMeeting(meetingId);
  }

  @Get('flagged-students/:meetingId')
  async getFlaggedStudents(@Param('meetingId') meetingId: string) {
    return this.proctoringService.getFlaggedStudents(meetingId);
  }

  @Post('resolve-alert/:alertId')
  async resolveAlert(@Param('alertId') alertId: string) {
    return this.proctoringService.resolveAlert(alertId);
  }
}