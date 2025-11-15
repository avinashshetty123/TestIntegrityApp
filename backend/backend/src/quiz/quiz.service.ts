import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveQuiz } from './entities/live-quiz.entity';
import { QuizResponse } from './entities/quiz-response.entity';
import { In } from 'typeorm';
import { SendQuestionDto, SubmitAnswerDto } from './dto/quiz.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    @InjectRepository(LiveQuiz) 
    private quizRepo: Repository<LiveQuiz>,
    
    @InjectRepository(QuizResponse) 
    private responseRepo: Repository<QuizResponse>,
    
    @InjectRepository(User) 
    private userRepo: Repository<User>
  ) {}

  async sendQuestion(meetingId: string, dto: SendQuestionDto, tutorId: string): Promise<LiveQuiz> {
    try {
      // End any active quiz for this meeting first
      const activeQuiz = await this.getActiveQuiz(meetingId);
      if (activeQuiz) {
        activeQuiz.status = 'COMPLETED';
        activeQuiz.endedAt = new Date();
        await this.quizRepo.save(activeQuiz);
      }

      const quiz = this.quizRepo.create({
        meetingId,
        questionId: `q_${Date.now()}`,
        question: dto.question,
        type: dto.type,
        options: dto.options,
        correctAnswer: dto.correctAnswer,
        timeLimit: dto.timeLimit,
        status: 'ACTIVE',
        startedAt: new Date(),
      });

      const savedQuiz = await this.quizRepo.save(quiz);
      this.logger.log(`Quiz created successfully with ID: ${savedQuiz.id}`);
      return savedQuiz;
    } catch (error) {
      this.logger.error(`Error creating quiz: ${error.message}`);
      throw error;
    }
  }

  async submitAnswer(dto: SubmitAnswerDto, studentId: string): Promise<QuizResponse> {
    try {
      const quiz = await this.quizRepo.findOne({ 
        where: { id: dto.quizId } 
      });
      
      if (!quiz) {
        throw new NotFoundException('Quiz not found');
      }

      if (quiz.status !== 'ACTIVE') {
        throw new ForbiddenException('Quiz is not active');
      }

      // Check if student already answered
      const existingResponse = await this.responseRepo.findOne({
        where: { 
          quiz: { id: dto.quizId }, 
          studentId 
        }
      });

      if (existingResponse) {
        throw new ForbiddenException('You have already answered this quiz');
      }

      // Get student name
      const student = await this.userRepo.findOne({ 
        where: { id: studentId } 
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Calculate if answer is correct
      const isCorrect = this.checkAnswer(quiz.correctAnswer, dto.answer, quiz.type);

      const response = this.responseRepo.create({
        quiz: { id: dto.quizId } as any, // Type workaround
        studentId,
        studentName: student.fullName || student.firstName || `Student-${studentId.slice(-4)}`,
        answer: dto.answer,
        isCorrect,
        responseTime: dto.responseTime || 0,
        submittedAt: new Date(),
      });

      const savedResponse = await this.responseRepo.save(response);
      this.logger.log(`Answer submitted by ${studentId} for quiz ${dto.quizId}`);
       
      return savedResponse;
    } catch (error) {
      this.logger.error(`Error submitting answer: ${error.message}`);
      throw error;
    }
  }

  private checkAnswer(correctAnswer: string, userAnswer: string, type: string): boolean {
    if (!correctAnswer || !userAnswer) return false;

    switch (type) {
      case 'MCQ':
      case 'TRUE_FALSE':
        return correctAnswer.trim().toLowerCase() === userAnswer.trim().toLowerCase();
      case 'SHORT_ANSWER':
        // For short answers, you might want more flexible matching
        return correctAnswer.trim().toLowerCase().includes(userAnswer.trim().toLowerCase()) ||
               userAnswer.trim().toLowerCase().includes(correctAnswer.trim().toLowerCase());
      default:
        return false;
    }
  }

  async endQuiz(quizId: string, tutorId: string): Promise<LiveQuiz> {
    const quiz = await this.quizRepo.findOne({ 
      where: { id: quizId } 
    });
    
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    quiz.status = 'COMPLETED';
    quiz.endedAt = new Date();
    
    return this.quizRepo.save(quiz);
  }

  async getQuizResults(quizId: string) {
    const quiz = await this.quizRepo.findOne({ 
      where: { id: quizId } 
    });
    
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const responses = await this.responseRepo.find({ 
      where: { quiz: { id: quizId } } 
    });

    // Build leaderboard
    const leaderboard = responses
      .map(r => ({
        studentId: r.studentId,
        studentName: r.studentName,
        isCorrect: r.isCorrect,
        responseTime: r.responseTime,
        submittedAt: r.submittedAt,
      }))
      .sort((a, b) => {
        if (a.isCorrect === b.isCorrect) {
          return a.responseTime - b.responseTime;
        }
        return b.isCorrect ? 1 : -1;
      });

    const topPerformer = leaderboard.length > 0 ? leaderboard[0] : null;

    return {
      quiz,
      responses,
      summary: {
        totalResponses: responses.length,
        correctAnswers: responses.filter(r => r.isCorrect).length,
        accuracy: responses.length > 0 ? 
          (responses.filter(r => r.isCorrect).length / responses.length) * 100 : 0,
        averageTime: responses.length > 0 ?
          responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length : 0,
        topPerformer: topPerformer ? {
          studentName: topPerformer.studentName,
          isCorrect: topPerformer.isCorrect,
          responseTime: topPerformer.responseTime,
        } : null,
      },
      leaderboard,
    };
  }

  async getMeetingLeaderboard(meetingId: string) {
    const quizzes = await this.quizRepo.find({ 
      where: { meetingId } 
    });
    
    const quizIds = quizzes.map(q => q.id);

    const responses = await this.responseRepo.find({
      where: { quiz: { id: In(quizIds) } },
      relations: ['quiz']
    });

    const scores = new Map<string, { 
      name: string; 
      correct: number; 
      totalTime: number; 
      totalAnswers: number;
    }>();

    for (const response of responses) {
      const studentData = scores.get(response.studentId) || {
        name: response.studentName,
        correct: 0,
        totalTime: 0,
        totalAnswers: 0,
      };

      if (response.isCorrect) {
        studentData.correct++;
      }
      studentData.totalTime += response.responseTime;
      studentData.totalAnswers++;

      scores.set(response.studentId, studentData);
    }

    const leaderboard = Array.from(scores.entries())
      .map(([studentId, data]) => ({
        studentId,
        studentName: data.name,
        correctAnswers: data.correct,
        totalAnswers: data.totalAnswers,
        accuracy: data.totalAnswers > 0 ? (data.correct / data.totalAnswers) * 100 : 0,
        averageTime: data.totalAnswers > 0 ? data.totalTime / data.totalAnswers : 0,
        totalTime: data.totalTime,
      }))
      .sort((a, b) => {
        // Sort by correct answers first, then by average time
        if (b.correctAnswers === a.correctAnswers) {
          return a.averageTime - b.averageTime;
        }
        return b.correctAnswers - a.correctAnswers;
      });

    return leaderboard;
  }

  async getActiveQuiz(meetingId: string): Promise<LiveQuiz | null> {
    return this.quizRepo.findOne({
      where: { 
        meetingId, 
        status: 'ACTIVE' 
      }
    });
  }

  async getQuizes(meetingId: string): Promise<LiveQuiz[]> {
    return this.quizRepo.find({
      where: { meetingId },
      order: { startedAt: 'DESC' }
    });
  }
}