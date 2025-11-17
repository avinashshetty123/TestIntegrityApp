import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger,ValidationPipe } from "@nestjs/common";
import cookieParser from 'cookie-parser';
import {SwaggerModule,DocumentBuilder} from '@nestjs/swagger';
import { SocketAdapter } from "./socket.adapter";
import * as bodyParser from 'body-parser';

async function bootstrap() {
  
  const logger=new Logger('Bootstrap');
  const app=await  NestFactory.create(AppModule,{
    logger:['error','warn','log','debug','verbose'],
  });
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  
  // Increase payload size limits
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser()); 
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:true,
      forbidNonWhitelisted:true,
      transform:true,
      disableErrorMessages:false,
      transformOptions: { enableImplicitConversion: true }

    }),

  )
  app.useWebSocketAdapter(new SocketAdapter(app));
  const config=new DocumentBuilder().setTitle("TestIntegrityBackend").setDescription("Api DOcs").setVersion('1').addBearerAuth().addCookieAuth().build();
  const document=SwaggerModule.createDocument(app,config);
  SwaggerModule.setup("doc",app,document);
    await app.listen(4000);
}
bootstrap();
