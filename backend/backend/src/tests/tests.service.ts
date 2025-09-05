import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Test } from './entities/test.entity';
import { Question } from './entities/questions.entity';
import { Submission } from './entities/submissions.entity';
import { Answer } from './entities/answers.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { QuestionType } from './entities/questions.entity';
@Injectable()
export class TestService {
  constructor(
    @InjectRepository(Test) private testRepo: Repository<Test>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(Submission) private submissionRepo: Repository<Submission>,
    @InjectRepository(Answer) private answerRepo: Repository<Answer>,
  ) {}


async createTest(
  tutor: User,
  title: string,
  description: string,
  questions: { questionText: string; type: QuestionType; options?: string[]; correctAnswer?: string }[],
  institutionName?: string,
) {


  const test = this.testRepo.create({
    title,
    description,
    institutionName: institutionName ?? tutor.institutionName,
    creator: { id: tutor.id } as User, // just pass id
    questions: questions.map((q) =>
      this.questionRepo.create({
        questionText: q.questionText,
        type: q.type as QuestionType, // ✅ ensure it matches enum
        options: q.options,
        correctAnswer: q.correctAnswer,
      }),
    ),
  });

  return await this.testRepo.save(test);
}




  /**
   * Get all tests (optionally filter by tutor or institution)
   */
async getAllTests(filter?: { tutorId?: number; institutionName?: string }) {
  const where: any = {};

  if (filter?.tutorId) {
    where.creator = { id: filter.tutorId };
  }
  if (filter?.institutionName) {
    where.institutionName = filter.institutionName;
  }

  return this.testRepo.find({
    where,
    relations: ['creator', 'questions'],
  });
}


  /**
   * Get one test with questions
   */
  async getTestById(testId: number) {
    const test = await this.testRepo.findOne({
      where: { id: testId },
      relations: ['creator', 'questions', 'submissions'],
    });

    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  /**
   * Student submits answers to a test
   */
  async submitAnswers(
    student: User,
    testId: number,
    answers: { questionId: number; response: string }[],
  ) {
    const test = await this.testRepo.findOne({
      where: { id: testId },
      relations: ['questions'],
    });
    if (!test) throw new NotFoundException('Test not found');

    const submission = this.submissionRepo.create({
      student,
      test,
      answers: answers.map((a) =>
        this.answerRepo.create({
          question: { id: a.questionId }, // safe DeepPartial relation
          response: a.response,
        }),
      ),
    });

    return this.submissionRepo.save(submission);
  }

  /**
   * Get all submissions for a test (for tutors/admins)
   */
  async getSubmissionsForTest(testId: number) {
    return this.submissionRepo.find({
      where: { test: { id: testId } },
      relations: ['student', 'answers', 'answers.question'],
    });
  }

  /**
   * Get results of a test (submissions + answers)
   */
  async getTestResults(testId: number) {
    return this.testRepo.findOne({
      where: { id: testId },
      relations: ['submissions', 'submissions.answers', 'submissions.student'],
    });
  }

  /**
   * Grade a submission (basic auto grading for MCQs/short answers)
   */
  async gradeSubmission(submissionId: number) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: ['answers', 'answers.question'],
    });

    if (!submission) throw new NotFoundException('Submission not found');

    let score = 0;
    let total = submission.answers.length;

    submission.answers.forEach((a) => {
      if (
        a.question.correctAnswer &&
        a.response.trim().toLowerCase() === a.question.correctAnswer.trim().toLowerCase()
      ) {
        score++;
      }
    });

    submission.score = score;
    submission.totalScore = total;

    return this.submissionRepo.save(submission);
  }

  /**
   * Delete a test (only tutor/admin who created it can delete)
   */
  async deleteTest(testId: number, tutor: User) {
    const test = await this.testRepo.findOne({
      where: { id: testId },
      relations: ['creator'],
    });
    if (!test) throw new NotFoundException('Test not found');

    if (tutor.role !== UserRole.ADMIN && test.creator.id !== tutor.id) {
      throw new ForbiddenException('You cannot delete this test');
    }

    await this.testRepo.remove(test);
    return { message: 'Test deleted successfully' };
  }
}
