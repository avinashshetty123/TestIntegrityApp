import { Injectable } from "@nestjs/common";
import { AccessToken } from "livekit-server-sdk";

@Injectable()
export class LivekitService{
    private readonly apikey=process.env.LIVEKIT_API_KEY;
    private readonly apiSecret=process.env.LIVEKIT_API_SECRET;
   
    async createToken(params:{roomName:string;identity:string;displayName?:string;isTeacher:boolean;ttl?:string;}):Promise<string>{
        const {roomName,identity,displayName,isTeacher,ttl='1h'}=params;
        const token=new AccessToken(this.apikey,this.apiSecret,{
            identity,
            name:displayName,
            ttl,
        });
        token.addGrant({
            roomJoin: true,
            room: roomName,
            canSubscribe: true,
            canPublish: true,
            canPublishData: true,
            canUpdateOwnMetadata: true,
            roomAdmin: isTeacher,
            roomCreate: true,
            roomList: true,
            roomRecord: true
        })
        return token.toJwt();
    }
}