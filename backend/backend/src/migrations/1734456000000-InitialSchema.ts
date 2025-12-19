import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1734456000000 implements MigrationInterface {
  name = 'InitialSchema1734456000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "role" character varying NOT NULL DEFAULT 'student',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "meeting" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" character varying,
        "scheduledAt" TIMESTAMP NOT NULL,
        "duration" integer NOT NULL DEFAULT 60,
        "status" character varying NOT NULL DEFAULT 'scheduled',
        "livekitRoomName" character varying,
        "createdById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "proctoring_session" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "meetingId" uuid,
        "participantId" uuid,
        "startTime" TIMESTAMP NOT NULL DEFAULT now(),
        "endTime" TIMESTAMP,
        "status" character varying NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_proctoring_session_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "proctoring_alert" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sessionId" uuid,
        "meetingId" uuid,
        "participantId" uuid,
        "alertType" character varying DEFAULT 'behavior',
        "severity" character varying DEFAULT 'medium',
        "description" character varying DEFAULT '',
        "timestamp" TIMESTAMP DEFAULT now(),
        "resolved" boolean DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_proctoring_alert_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "proctoring_alert" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "proctoring_session" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meeting" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user" CASCADE`);
  }
}