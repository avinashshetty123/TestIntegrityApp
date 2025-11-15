import { Controller, Post, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DeepfakeService } from './deepfake.service';

@Controller('deepfake')
export class DeepfakeController {
  constructor(private readonly deepfakeService: DeepfakeService) {}

  @Post('check')
  @UseInterceptors(FileInterceptor('file'))
  async checkDeepFake(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { userId: string; meetingId: string; participantId: string },
  ) {
    return await this.deepfakeService.analyzeImage(
      file,
      body.userId,
      body.meetingId,
      body.participantId,
    );
  }
}
