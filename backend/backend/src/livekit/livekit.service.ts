import { Injectable, Logger } from "@nestjs/common";
import { AccessToken, RoomServiceClient, DataPacket_Kind } from "livekit-server-sdk";

@Injectable()
export class LivekitService {
  private readonly logger = new Logger(LivekitService.name);
  private readonly apikey = process.env.LIVEKIT_API_KEY;
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET;
  private readonly serverUrl = process.env.LIVEKIT_SERVER_URL || 'ws://localhost:7880';
  private readonly roomService: RoomServiceClient;

  constructor() {
    this.roomService = new RoomServiceClient(this.serverUrl, this.apikey, this.apiSecret);
  }

  async createToken(params: { roomName: string; identity: string; displayName?: string; isTeacher: boolean; ttl?: string }): Promise<string> {
    const { roomName, identity, displayName, isTeacher, ttl = '1h' } = params;
    const token = new AccessToken(this.apikey, this.apiSecret, {
      identity,
      name: displayName,
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
    });
    
    return token.toJwt();
  }

  // Send data to specific participants (tutors only)
  async sendDataToParticipants(roomName: string, data: any, participantIdentities: string[]) {
    try {
      if (participantIdentities.length === 0) {
        this.logger.warn(`No participants to send data to in room ${roomName}`);
        return;
      }

      const payload = JSON.stringify(data);
      const payloadBytes = Buffer.from(payload) as unknown as Uint8Array;
      
      await this.roomService.sendData(
        roomName,
        payloadBytes,
        DataPacket_Kind.RELIABLE,
        participantIdentities
      );
      
      this.logger.log(`Data sent to ${participantIdentities.length} participants in room ${roomName}`);
    } catch (error) {
      this.logger.error(`Failed to send data to participants in room ${roomName}:`, error);
      throw error;
    }
  }

  // Broadcast to all participants
  async sendDataToRoom(roomName: string, data: any, destinationIdentities?: string[]) {
    try {
      const payload = JSON.stringify(data);
      const payloadBytes = Buffer.from(payload) as unknown as Uint8Array;
      
      await this.roomService.sendData(
        roomName,
        payloadBytes,
        DataPacket_Kind.RELIABLE,
        destinationIdentities
      );
      
      this.logger.log(`Data sent to room ${roomName}`);
    } catch (error) {
      this.logger.error(`Failed to send data to room ${roomName}:`, error);
      throw error;
    }
  }

  // Get all tutors in a room
  async getTutorsInRoom(roomName: string): Promise<string[]> {
    try {
      const participants = await this.roomService.listParticipants(roomName);
      const tutors = participants.filter(p => 
        p.metadata && JSON.parse(p.metadata).isTeacher === true
      );
      
      return tutors.map(tutor => tutor.identity);
    } catch (error) {
      this.logger.error(`Failed to get tutors from room ${roomName}:`, error);
      return [];
    }
  }

  // Enhanced proctoring alert - sends only to tutors
  async broadcastProctoringAlert(roomName: string, alert: any) {
    try {
      const tutors = await this.getTutorsInRoom(roomName);
      
      if (tutors.length === 0) {
        this.logger.warn(`No tutors found in room ${roomName} to send proctoring alert`);
        return;
      }

      const alertData = {
        type: 'PROCTORING_ALERT',
        data: alert,
        timestamp: new Date().toISOString(),
      };
      
      await this.sendDataToParticipants(roomName, alertData, tutors);
      this.logger.log(`Proctoring alert sent to ${tutors.length} tutor(s) in room ${roomName}`);
    } catch (error) {
      this.logger.error(`Failed to broadcast alert to tutors in room ${roomName}:`, error);
    }
  }

  // Send real-time dashboard updates to tutors
  async sendDashboardUpdate(roomName: string, dashboardData: any) {
    try {
      const tutors = await this.getTutorsInRoom(roomName);
      
      if (tutors.length === 0) return;

      const updateData = {
        type: 'DASHBOARD_UPDATE',
        data: dashboardData,
        timestamp: new Date().toISOString(),
      };
      
      await this.sendDataToParticipants(roomName, updateData, tutors);
    } catch (error) {
      this.logger.error(`Failed to send dashboard update to room ${roomName}:`, error);
    }
  }

  async disconnectParticipant(roomName: string, participantIdentity: string): Promise<void> {
    try {
      this.logger.log(`Disconnecting participant ${participantIdentity} from room ${roomName}`);
      await this.roomService.removeParticipant(roomName, participantIdentity);
      this.logger.log(`Successfully disconnected participant ${participantIdentity}`);
    } catch (error) {
      this.logger.error(`Failed to disconnect participant ${participantIdentity}:`, error);
      throw error;
    }
  }

  async getRoomInfo(roomName: string) {
    try {
      return await this.roomService.listRooms([roomName]);
    } catch (error) {
      this.logger.error(`Failed to get room info for ${roomName}:`, error);
      throw error;
    }
  }

  async listParticipants(roomName: string) {
    try {
      return await this.roomService.listParticipants(roomName);
    } catch (error) {
      this.logger.error(`Failed to list participants for room ${roomName}:`, error);
      throw error;
    }
  }
}