import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { SendQuestionDto, SubmitAnswerDto } from './dto/quiz.dto';

@WebSocketGateway({
  cors: { 
    origin: '*',
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true 
  },
  namespace: '/quiz',
  transports: ['websocket', 'polling']
})
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('QuizGateway');

  private roomParticipants = new Map<string, Set<string>>();

  constructor(
    private quizService: QuizService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // Send immediate acknowledgement
    client.emit('connected', { status: 'connected', clientId: client.id });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove from all rooms
    this.roomParticipants.forEach((participants, room) => {
      if (participants.has(client.id)) {
        participants.delete(client.id);
        this.logger.log(`Removed client ${client.id} from room ${room}`);
        
        // If room is empty, clean up
        if (participants.size === 0) {
          this.roomParticipants.delete(room);
        }
      }
    });
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { meetingId: string; userId: string; role: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { meetingId, userId, role } = data;
      
      if (!meetingId || !userId || !role) {
        client.emit('error', { message: 'Missing required fields: meetingId, userId, role' });
        return;
      }
      
      // Leave previous rooms
      const rooms = Array.from(client.rooms);
      rooms.forEach(room => {
        if (room !== client.id) {
          client.leave(room);
        }
      });
      
      await client.join(meetingId);
      
      if (!this.roomParticipants.has(meetingId)) {
        this.roomParticipants.set(meetingId, new Set());
      }
      this.roomParticipants.get(meetingId)!.add(client.id);
      
      client.data = { userId, role, meetingId };
      
      this.logger.log(`User ${userId} (${role}) joined quiz room ${meetingId}`);
      
      // Send acknowledgement
      client.emit('joinedRoom', { 
        meetingId, 
        userId, 
        role, 
        message: 'Successfully joined room' 
      });
      
      // Send active quiz if exists
      if (role === 'student') {
        const activeQuiz = await this.quizService.getActiveQuiz(meetingId);
        if (activeQuiz) {
          client.emit('questionReceived', {
            id: activeQuiz.id,
            question: activeQuiz.question,
            type: activeQuiz.type,
            options: activeQuiz.options,
            timeLimit: activeQuiz.timeLimit,
            startedAt: activeQuiz.startedAt,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error joining room: ${error.message}`);
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('sendQuestion')
  async handleSendQuestion(
    @MessageBody() dto: SendQuestionDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { meetingId, userId, role } = client.data;
      
      if (!meetingId || !userId) {
        client.emit('error', { message: 'Not joined to any room' });
        return;
      }
      
      if (role !== 'tutor') {
        client.emit('error', { message: 'Only tutors can send questions' });
        return;
      }

      this.logger.log(`Tutor ${userId} sending question to room ${meetingId}`);
      
      const quiz = await this.quizService.sendQuestion(meetingId, dto, userId);
      
      // Send to all students in the room
      this.server.to(meetingId).emit('questionReceived', {
        id: quiz.id,
        question: quiz.question,
        type: quiz.type,
        options: quiz.options,
        timeLimit: quiz.timeLimit,
        startedAt: quiz.startedAt,
      });

      client.emit('questionSent', { 
        quizId: quiz.id,
        message: 'Question sent successfully'
      });
      
      this.logger.log(`Question sent to room ${meetingId} by ${userId}, Quiz ID: ${quiz.id}`);
      
    } catch (error) {
      this.logger.error(`Error sending question: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('submitAnswer')
  async handleSubmitAnswer(
    @MessageBody() dto: SubmitAnswerDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { userId, role, meetingId } = client.data;
      
      if (role !== 'student') {
        client.emit('error', { message: 'Only students can submit answers' });
        return;
      }

      this.logger.log(`Student ${userId} submitting answer for quiz ${dto.quizId}`);
      
      const response = await this.quizService.submitAnswer(dto, userId);
      
      client.emit('answerSubmitted', { 
        responseId: response.id,
        submittedAt: response.submittedAt,
        message: 'Answer submitted successfully'
      });
      
      // Notify tutor about new submission
      this.server.to(meetingId).emit('newAnswer', {
        quizId: dto.quizId,
        studentId: userId,
        studentName: response.studentName
      });
      
      this.logger.log(`Answer submitted by ${userId} for quiz ${dto.quizId}`);
      
    } catch (error) {
      this.logger.error(`Error submitting answer: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('endQuiz')
  async handleEndQuiz(
    @MessageBody() data: { quizId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { meetingId, userId, role } = client.data;
      
      if (role !== 'tutor') {
        client.emit('error', { message: 'Only tutors can end quiz' });
        return;
      }

      this.logger.log(`Tutor ${userId} ending quiz ${data.quizId}`);
      
      await this.quizService.endQuiz(data.quizId, userId);
      
      this.server.to(meetingId).emit('quizEnded', { 
        quizId: data.quizId,
        endedBy: userId
      });
      
      this.logger.log(`Quiz ${data.quizId} ended by ${userId}`);
      
    } catch (error) {
      this.logger.error(`Error ending quiz: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  // Helper method to get room participants
  getRoomParticipants(meetingId: string): number {
    return this.roomParticipants.get(meetingId)?.size || 0;
  }
}