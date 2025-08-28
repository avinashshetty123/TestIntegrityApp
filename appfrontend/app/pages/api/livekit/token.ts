import { NextApiRequest,NextApiResponse } from "next";
import {AccessToken} from 'livekit-server-sdk';
import {v4 as uuidv4} from 'uuid';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
const LIVEKIT_HOST = process.env.LIVEKIT_HOST!;

export default function handler(req:NextApiRequest,res:NextApiResponse)
{
    if(req.method!=='POST')return res.status(405).end();
    const {room,identity}=req.body;
    if(!room||!identity)
        return res.status(400).json({
    error:"Missing room or identity"});
    const token =new AccessToken(LIVEKIT_API_KEY,LIVEKIT_API_SECRET,{
        identity,
        ttl:60*60,
    })
    token.addGrant({room,roomJoin:true,canPublish:true,canPublishData:true});
    res.status(200).json({
        token:token.toJwt(),
        url:LIVEKIT_HOST,
    })

}