import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Test } from './entities/test.entity';
import { Question } from './entities/questions.entity';
import { Submission } from './entities/submissions.entity';
import { Answer } from './entities/answers.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { QuestionType } from './entities/questions.entity';
import { DeepPartial } from 'typeorm';
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
  questions: {
    questionText: string;
    type: QuestionType;
    options?: string[];
    correctAnswers?: string[];
    mcqMode?: 'single' | 'multiple';
    marks?: number;
    testPic?: string;
    publicId?: string;
  }[],
  institutionName?: string,
) {
  const test = this.testRepo.create({
    title,
    description,
    institutionName: institutionName ?? tutor.institutionName,
    creator: { id: tutor.id } as User,
    questions: questions.map((q) => ({
      questionText: q.questionText,
      type: q.type,
      options: q.options ?? null,
      correctAnswers: q.correctAnswers ?? null,
      marks: q.marks ?? 1,
      testPic: q.testPic ?? null,
      publicId: q.publicId ?? null,
    })) as DeepPartial<Question>[], // ✅ cast fixes TS error
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
    answers: { questionId: number; response: string | string[] }[],
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
          question: { id: a.questionId },
          response: Array.isArray(a.response) ? JSON.stringify(a.response) : a.response,
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
async autoGradeAllSubmissions(testId: number) {
    const submissions = await this.submissionRepo.find({
      where: { test: { id: testId } },
      relations: ['answers', 'answers.question'],
    });

    if (!submissions.length) throw new NotFoundException('No submissions found for this test');

    for (const submission of submissions) {
      let total = 0;

      submission.answers.forEach((a) => {
        const q = a.question;

        if (q.type === QuestionType.MCQ || q.type === QuestionType.TRUE_FALSE) {
          if (q.correctAnswers) {
            const correct = q.correctAnswers.map((c) => c.trim().toLowerCase());
            const responseArr = Array.isArray(a.response)
              ? a.response
              : JSON.parse(a.response || '[]');

            const cleanedResp = responseArr.map((r: string) => r.trim().toLowerCase());

            const isCorrect =
              correct.length === cleanedResp.length &&
              correct.every((c) => cleanedResp.includes(c));

            if (isCorrect) {
              a.score = q.marks;
              total += q.marks;
            } else {
              a.score = 0;
            }
          }
        }
      });

      submission.score = total;
      submission.totalScore = submission.answers.reduce((sum, ans) => sum + (ans.question.marks || 1), 0);

      await this.answerRepo.save(submission.answers);
      await this.submissionRepo.save(submission);
    }

    return { message: `${submissions.length} submissions graded successfully` };
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
  async updateStudentMarks(
    submissionId: number,
    updatedScores: { answerId: number; score: number }[],
  ) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: ['answers', 'answers.question'],
    });

    if (!submission) throw new NotFoundException('Submission not found');

    let total = 0;
    submission.answers.forEach((ans) => {
      const update = updatedScores.find((u) => u.answerId === ans.id);
      if (update) {
        ans.score = update.score;
        total += update.score;
      }
    });

    submission.score = total;
    submission.totalScore = submission.answers.reduce((sum, ans) => sum + (ans.question.marks || 1), 0);

    await this.answerRepo.save(submission.answers);
    return this.submissionRepo.save(submission);
  }
}
