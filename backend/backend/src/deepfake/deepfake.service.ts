import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import  FormData from 'form-data';
@Injectable()
export class DeepfakeService {
  private pythonServiceUrl = 'http://localhost:8000/predict';

  async analyzeImage(file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path), file.originalname);

    try {
      const response = await axios.post(this.pythonServiceUrl, formData, {
        headers: formData.getHeaders(),
      });
      return response.data;
    } catch (err) {
      throw new HttpException('Python service error', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      fs.unlinkSync(file.path); // cleanup temp file
    }
  }
}
