import { IsDateString, IsOptional, IsString, Length } from "class-validator";

export class CreateMeetingDto{
    @IsString()
    @Length(3,100)
    title:string;
    @IsOptional()
    @IsString()
    description?:string;
    @IsOptional()
    @IsDateString()
    scheduledAt?:string;
    @IsOptional()
    @IsString()
    institution?:string;
    @IsOptional()
    @IsString()
    subject?:string;
    @IsOptional()
    noOfStudent?:string;
}


