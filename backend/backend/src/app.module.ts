import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TestsModule } from './tests/tests.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'testdb',
      autoLoadEntities: true,
      synchronize: true, // ❌ turn off in production
    }),
    AuthModule,
    UserModule,
    TestsModule,
  ],
})
export class AppModule {}
