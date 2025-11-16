import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,

} from '@nestjs/websockets';

import { Server } from 'socket.io';

@WebSocketGateway({
  namespace: 'meeting',
  cors: {
    origin: '*',
    credentials:true
  },
})
export class MeetingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any, ...args: any[]) {
    console.log(`Meeting client connected: ${client.id}`);
    const meetingId = client.handshake.query.meetingId;
    const userType = client.handshake.query.userType;
    console.log(`User ${client.id} connected to meeting ${meetingId} as ${userType}`);
  }

  handleDisconnect(client: any) {
    console.log(`Meeting client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-meeting-room')
  handleJoinMeetingRoom(client: any, data: { meetingId: string }) {
    client.join(data.meetingId);
    console.log(`Client ${client.id} joined meeting room: ${data.meetingId}`);
  }

  @SubscribeMessage('leave-meeting-room')
  handleLeaveMeetingRoom(client: any, data: { meetingId: string }) {
    client.leave(data.meetingId);
    console.log(`Client ${client.id} left meeting room: ${data.meetingId}`);
  }

  @SubscribeMessage('approve-join-request')
  handleApproveJoinRequest( data: { requestId: string, studentId: string, meetingId: string }) {
    // Handle join request approval
    this.server.to(data.meetingId).emit('join-request-approved', data);
  }

  @SubscribeMessage('reject-join-request')
  handleRejectJoinRequest(client: any, data: { requestId: string, meetingId: string }) {
    // Handle join request rejection
    this.server.to(data.meetingId).emit('join-request-rejected', data);
  }

  @SubscribeMessage('lock-meeting')
  handleLockMeeting(client: any, data: { meetingId: string }) {
    this.server.to(data.meetingId).emit('meeting-locked', data);
  }

  @SubscribeMessage('unlock-meeting')
  handleUnlockMeeting(client: any, data: { meetingId: string }) {
    this.server.to(data.meetingId).emit('meeting-unlocked', data);
  }

  @SubscribeMessage('kick-participant')
  handleKickParticipant(client: any, data: { meetingId: string, participantId: string }) {
    this.server.to(data.meetingId).emit('participant-kicked', data);
  }

  @SubscribeMessage('broadcast-quiz')
  handleBroadcastQuiz(client: any, data: { meetingId: string, quizData: any }) {
    this.server.to(data.meetingId).emit('quiz-broadcast', data);
  }

  // Method to notify about new join requests


  // Method to send proctoring alerts
  notifyProctoringAlert(meetingId: string, alert: any) {
    this.server.to(meetingId).emit('proctoring-alert', alert);
  }
  // In your MeetingGateway class - ADD this method:
notifyStudentApproval(studentId: string, meetingId: string) {
  this.server.to(meetingId).emit('join-request-approved', {
    studentId,
    meetingId,
    approvedAt: new Date().toISOString()
  });
}

// Also improve the existing method:
notifyJoinRequest(meetingId: string, request: any) {
  this.server.to(meetingId).emit('join-request', request);
}
}