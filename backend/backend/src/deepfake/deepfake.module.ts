import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";

@Module({
    imports:[
        MulterModule.register({
            dest:'./uploads',
        }),
    ],
    controllers:[]
})
export class DeepfakeModule{};