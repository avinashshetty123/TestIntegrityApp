import { Controller,Post,UploadedFile,UseInterceptors } from "@nestjs/common";
import { DeepfakeService } from "./deepfake.service";
import { FileInterceptor } from "@nestjs/platform-express";
@Controller('deepfake')
export class DeepfakeController{
    constructor(private readonly deepfakeService:DeepfakeService){}
    @Post('check')
    @UseInterceptors(FileInterceptor('file'))
    async checkDeepFake(@UploadedFile() file:Express.Multer.File){
        return await this.deepfakeService.analyzeImage(file);
    }

}