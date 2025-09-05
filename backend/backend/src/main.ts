import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger,ValidationPipe } from "@nestjs/common";
async function bootstrap() {
  
  const logger=new Logger('Bootstrap');
  const app=await  NestFactory.create(AppModule,{
    logger:['error','warn','log','debug','verbose'],
  });
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:true,
      forbidNonWhitelisted:true,
      transform:true,
      disableErrorMessages:false
    }),

  )
    await app.listen(4000);
}
bootstrap();
