import { Injectable, NotFoundException, ForbiddenException, Inject, NotAcceptableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Test } from './entities/test.entity';
import { Question } from './entities/questions.entity';
import { Submission } from './entities/submissions.entity';
import { Answer } from './entities/answers.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { QuestionType } from './entities/questions.entity';
import { DeepPartial } from 'typeorm';
import { CreateTestSession,UpdateTestSessionDto } from './dto/test.dto';
import { MeetingSession } from 'src/meetings/entities/meeting-session.entity';
import { Result } from './entities/results.entity';

@Injectable()
export class TestService {
  constructor(
    @InjectRepository(Test) private testRepo: Repository<Test>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(Submission) private submissionRepo: Repository<Submission>,
    @InjectRepository(Answer) private answerRepo: Repository<Answer>,
    @InjectRepository(MeetingSession) private sessionRepo:Repository<MeetingSession>,
    @InjectRepository(Result) private resultRepo: Repository<Result>, 
  ) {}
async createTest(
  tutor:User,
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
  durationMinutes?: number,
  scheduledAt?: Date,
  institutionName?: string,
  ispublished: boolean = false,
) {
  const test = this.testRepo.create({
    title,
    description,
    institutionName: institutionName ?? tutor.institutionName,
    creator: { id: tutor.id } as User,
     durationMinutes: durationMinutes || 120, // Default 2 hours
    scheduledAt: scheduledAt || new Date(),
    // creatorId: tutor.id,
    totalScore: questions.reduce((acc, q) => acc + (q.marks ?? 1), 0),
    ispublished: ispublished,
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
async getAllTests(filter?: { tutorId?: number; institutionName?: string }) {
  const where: any = {};

  if (filter?.tutorId) {
    where.creator = { id: filter.tutorId };
  }
  if (filter?.institutionName) {
    where.institutionName = filter.institutionName;
  }

  const test= this.testRepo.find({
    where,
    relations: ['creator', 'questions'],
  });
  return (await test).filter((t) => t.ispublished === true);
}

  async getTestById(testId: number) {
    const test = await this.testRepo.findOne({
      where: { id: testId },
      relations: ['creator', 'questions', 'submissions'],
    });

    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  /**
   * Student submits answers to a test*/
// async saveProgress(
//   student: User,
//   testId: number,
//   answers: { questionId: number; response: string | string[] }[],
// ) {
//   const test = await this.testRepo.findOne({
//     where: { id: testId },
//     relations: ['questions'],
//   });
//   if (!test) throw new NotFoundException('Test not found');

//   // 🧠 Find existing submission or create one
//   let submission = await this.submissionRepo.findOne({
//     where: { student: { id: student.id }, test: { id: testId } },
//     relations: ['answers'],
//   });

//   if (!submission) {
//     submission = this.submissionRepo.create({
//       student,
//       test,
//       isFinal: false,
//       evaluated: false,
//       submittedAt: new Date(),
//     });
//     submission = await this.submissionRepo.save(submission);
//   }

//   // 🧹 Remove old answers (so new ones replace them)
//   await this.answerRepo.delete({ submission: { id: submission.id } });

//   // 🧩 Insert new answers
//   const answerEntities = answers.map((a) =>
//     this.answerRepo.create({
//       submission,
//       submissionId: submission.id,
//       questionId: a.questionId,
//       response: Array.isArray(a.response) ? a.response : [a.response],
//     }),
//   );
//   await this.answerRepo.save(answerEntities);

//   // ⚡ DO NOT call .update() or .save(submission) unless you changed scalar values
//   // We’ll just fetch the latest version and return it
//   const updated = await this.submissionRepo.findOne({
//     where: { id: submission.id },
//     relations: ['answers', 'test'],
//   });

//   return updated;
// }


 async getStudentQuestions(testId: number, studentId: string) {
    const test = await this.testRepo.findOne({
      where: { id: testId },
      relations: ['questions'],
    });

    if (!test) throw new NotFoundException('Test not found');
    const sub=await this.submissionRepo.findOne({
      where:{testId:testId,studentId:studentId}
    });
    if(sub){
      throw new NotAcceptableException("You are not allowed to give test again");
      return;
    }

    // return only safe data (no correctAnswers)
    return {
      id: test.id,
      title: test.title,
      description: test.description,
      institutionName: test.institutionName,
      questions: test.questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        type: q.type,
        options: q.options,
        testPic: q.testPic,
        marks: q.marks,
      })),
    };
  }



// async finalizeSubmission(student: User, testId: number) {
//   const submission = await this.submissionRepo.findOne({
//     where: { student: { id: student.id }, test: { id: testId }, isFinal: false },
//     relations: ['test', 'answers'],
//   });

//   if (!submission) throw new NotFoundException('No draft submission found');

//   submission.isFinal = true;
//   submission.submittedAt = new Date();
//   return this.submissionRepo.save(submission);
// }
// async getProgress(student: User, testId: number) {
//   const submission = await this.submissionRepo.findOne({
//     where: { student: { id: student.id }, test: { id: testId }, isFinal: false },
//     relations: ['answers', 'answers.question'],
//   });

//   return submission ? submission.answers : [];
// }


async submitAnswers(
  student: { userId: string; email: string; role: string },
  testId: number,
  answers: { questionId: number; response?: string | string[] }[],
  violations:number,
) {
  // 1️⃣ Ensure test exists
  const test = await this.testRepo.findOne({
    where: { id: testId },
    relations: ['questions'],
  });
  if (!test) throw new NotFoundException('Test not found');
  console.log(student);

  // 2️⃣ Create submission (assign both relation + foreign key)
  const submission = this.submissionRepo.create({
                     // ✅ relation object
    studentId: student.userId,        // ✅ UUID string
    test,                         // ✅ relation object
    testId: test.id,
    isFinal: true,
    evaluated: false,
    submittedAt: new Date(),
    violations:violations

  });

  await this.submissionRepo.save(submission);

  // 3️⃣ Prepare answers
  const answersToSave = test.questions.map((question) => {
    const given = answers.find((a) => a.questionId === question.id);
    const response =
      given && given.response
        ? Array.isArray(given.response)
          ? given.response
          : [given.response]
        : ['Not Provided'];

    return this.answerRepo.create({
      submission,
      submissionId: submission.id,
      question,
      questionId: question.id,
      response,
    });
  });

  await this.answerRepo.save(answersToSave);

  // 4️⃣ Return submission with answers
  return this.submissionRepo.findOne({
    where: { id: submission.id },
    relations: ['test', 'answers', 'answers.question'],
  });
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
  
  /**
   * Grade a submission (basic auto grading for MCQs/short answers)
   */
async autoGradeAllSubmissions(testId: number) {
    const submissions = await this.submissionRepo.find({
      where: { test: { id: testId } },
      relations: ['answers', 'answers.question', 'test'],
    });

    if (!submissions.length) throw new NotFoundException('No submissions found for this test');

    for (const submission of submissions) {
      await this.gradeSubmissionAndCreateResult(submission);
    }

    return { message: `${submissions.length} submissions graded successfully` };
  }

  /**
   * Grade a single submission and create/update result
   */
  private async gradeSubmissionAndCreateResult(submission: Submission) {
    let totalScore = 0;
    const scores: Record<string, number> = {};
    const feedbacks: Record<string, string> = {};

    // Grade each answer
    submission.answers.forEach((answer) => {
      const question = answer.question;
      let score = 0;
      let feedback = '';

      if (question.type === QuestionType.MCQ || question.type === QuestionType.TRUE_FALSE) {
        if (question.correctAnswers && answer.response) {
          const correctAnswers = question.correctAnswers.map(c => c.trim().toLowerCase());
          const studentAnswers = Array.isArray(answer.response) 
            ? answer.response.map(r => r.trim().toLowerCase())
            : [answer.response.trim().toLowerCase()];

          const isCorrect = correctAnswers.length === studentAnswers.length &&
            correctAnswers.every(c => studentAnswers.includes(c));

          score = isCorrect ? question.marks : 0;
          feedback = isCorrect ? 'Correct' : 'Incorrect';
        }
      } else if (question.type === QuestionType.SHORT) {
        // For short answers, check if any of the correct answers match
        if (question.correctAnswers && answer.response) {
          const correctAnswers = question.correctAnswers.map(c => c.trim().toLowerCase());
          const studentAnswer = Array.isArray(answer.response) 
            ? answer.response[0]?.trim().toLowerCase() 
            : answer.response.trim().toLowerCase();

          const isCorrect = correctAnswers.some(c => 
            studentAnswer.includes(c) || c.includes(studentAnswer)
          );
          score = isCorrect ? question.marks : 0;
          feedback = isCorrect ? 'Correct' : 'Partially correct or incorrect';
        }
      } else if (question.type === QuestionType.ESSAY) {
        // Essay questions need manual grading
        score = 0; // Default 0 until manually graded
        feedback = 'Pending manual evaluation';
      }

      answer.score = score;
      totalScore += score;
      
      // Store in scores and feedbacks objects
      scores[question.id] = score;
      feedbacks[question.id] = feedback;
    });

    // Update submission
    submission.score = totalScore;
    submission.totalScore = submission.answers.reduce((sum, ans) => sum + (ans.question.marks || 1), 0);
    submission.evaluated = true;

    await this.answerRepo.save(submission.answers);
    await this.submissionRepo.save(submission);

    // Create or update result
    await this.createOrUpdateResult(submission, totalScore, scores, feedbacks);
  }

  /**
   * Create or update result for a submission
   */
  // private async createOrUpdateResult(
  //   submission: Submission, 
  //   totalScore: number, 
  //   scores: Record<string, number>, 
  //   feedbacks: Record<string, string>
  // ) {
  //   let result = await this.resultRepo.findOne({
  //     where: { submissionId: submission.id }
  //   });

  //   const totalPossible = submission.totalScore;
  //   const percentage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
  //   const passed = percentage >= 60; // 60% passing criteria

  //   if (result) {
  //     // Update existing result
  //     result.totalScore = totalScore;
  //     result.percentage = percentage;
  //     result.passed = passed;
  //     result.scores = scores;
  //     result.feedbacks = feedbacks;
  //     result.gradedAt = new Date();
  //   } else {
  //     // Create new result
  //     result = this.resultRepo.create({
  //       submission,
  //       submissionId: submission.id,
  //       totalScore,
  //       percentage,
  //       passed,
  //       scores,
  //       feedbacks,
  //       overallFeedback: passed ? 'Good job!' : 'Needs improvement',
  //       gradedAt: new Date(),
  //     });
  //   }

  //   return this.resultRepo.save(result);
  // }

  /**
   * Update student marks manually and update result
   */
/**
 * Update student marks manually and update result
 */
async updateStudentMarks(
  submissionId: number,
  updatedScores: { answerId: number; score: number; feedback?: string }[],
  overallFeedback?: string // ✅ Accept overallFeedback parameter
) {
  const submission = await this.submissionRepo.findOne({
    where: { id: submissionId },
    relations: ['answers', 'answers.question', 'test'],
  });

  if (!submission) throw new NotFoundException('Submission not found');

  const scores: Record<string, number> = {};
  const feedbacks: Record<string, string> = {};
  let totalScore = 0;

  // Update each answer with manual scores
  submission.answers.forEach((answer) => {
    const update = updatedScores.find((u) => u.answerId === answer.id);
    if (update) {
      answer.score = update.score;
      totalScore += update.score;
      
      // Store in scores and feedbacks
      scores[answer.questionId] = update.score;
      feedbacks[answer.questionId] = update.feedback || 'Manually graded';
    }
  });

  submission.score = totalScore;
  submission.totalScore = submission.answers.reduce((sum, ans) => sum + (ans.question.marks || 1), 0);
  submission.evaluated = true;

  await this.answerRepo.save(submission.answers);
  await this.submissionRepo.save(submission);

  // ✅ Update the result with overall feedback
  await this.createOrUpdateResult(submission, totalScore, scores, feedbacks, overallFeedback);

  return submission;
}
private async createOrUpdateResult(
  submission: Submission, 
  totalScore: number, 
  scores: Record<string, number>, 
  feedbacks: Record<string, string>,
  overallFeedback?: string // ✅ Add this parameter
) {
  let result = await this.resultRepo.findOne({
    where: { submissionId: submission.id }
  });

  const totalPossible = submission.totalScore;
  const percentage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
  const passed = percentage >= 60;

  if (result) {
    result.totalScore = totalScore;
    result.percentage = percentage;
    result.passed = passed;
    result.scores = scores;
    result.feedbacks = feedbacks;
    result.overallFeedback = overallFeedback || result.overallFeedback; // ✅ Update overall feedback
    result.gradedAt = new Date();
  } else {
    result = this.resultRepo.create({
      submission,
      submissionId: submission.id,
      totalScore,
      percentage,
      passed,
      scores,
      feedbacks,
      overallFeedback: overallFeedback || (passed ? 'Good job!' : 'Needs improvement'), // ✅ Use provided feedback
      gradedAt: new Date(),
    });
  }

  return this.resultRepo.save(result);
}
  /**
   * Get results for a specific test
   */
  async getTestResults(testId: number) {
    const submissions = await this.submissionRepo.find({
      where: { test: { id: testId } },
      relations: ['student', 'answers', 'answers.question', 'result'],
    });

    return submissions.map(submission => ({
      submission,
      result: submission.result,
      student: submission.student,
      score: submission.score,
      totalScore: submission.totalScore,
    }));
  }

  /**
   * Get student results with detailed result information
   */
  async getStudentResults(studentId: string) {
    const submissions = await this.submissionRepo.find({
      where: { student: { id: studentId } },
      relations: ['test', 'answers', 'answers.question', 'result'],
      order: { id: 'DESC' }
    });

    return submissions.map(submission => ({
      test: submission.test,
      submission,
      result: submission.result,
      score: submission.score,
      totalScore: submission.totalScore,
      submittedAt: submission.submittedAt,
    }));
  }

  /**
   * Get detailed result for a specific submission
   */
  async getSubmissionResult(submissionId: number) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: ['student', 'test', 'answers', 'answers.question', 'result'],
    });

    if (!submission) throw new NotFoundException('Submission not found');

    return {
      submission,
      result: submission.result,
      student: submission.student,
      test: submission.test,
      answers: submission.answers,
    };
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

    if (tutor.role !== UserRole.TUTOR && test.creator.id !== tutor.id) {
      throw new ForbiddenException('You cannot delete this test');
    }

    await this.testRepo.remove(test);
    return { message: 'Test deleted successfully' };
  }
  // async updateStudentMarks(
  //   submissionId: number,
  //   updatedScores: { answerId: number; score: number }[],
  // ) {
  //   const submission = await this.submissionRepo.findOne({
  //     where: { id: submissionId },
  //     relations: ['answers', 'answers.question'],
  //   });

  //   if (!submission) throw new NotFoundException('Submission not found');

  //   let total = 0;
  //   submission.answers.forEach((ans) => {
  //     const update = updatedScores.find((u) => u.answerId === ans.id);
  //     if (update) {
  //       ans.score = update.score;
  //       total += update.score;
  //     }
  //   });

  //   submission.score = total;
  //   submission.totalScore = submission.answers.reduce((sum, ans) => sum + (ans.question.marks || 1), 0);
  //   submission.evaluated=true;

  //   await this.answerRepo.save(submission.answers);
  //   return this.submissionRepo.save(submission);
  // }

  // async getStudentResults(studentId: string) {
  //   return this.submissionRepo.find({
  //     where: { student: { id: studentId } },
  //     relations: ['test', 'answers', 'answers.question'],
  //     order: { id: 'DESC' }
  //   });
  // }
  async deleteSubmission(submissionId){
const submission=this.submissionRepo.findOne({where:{id:submissionId}});
if(!submission){
  throw new NotFoundException('Submission not found');
}

await this.submissionRepo.delete(submissionId);
  }

  async getTutorTests(tutorId: string) {
    return this.testRepo.find({
      where: { creator: { id: tutorId } },
      relations: ['questions', 'submissions'],
      order: { createdAt: 'DESC' }
    });
  }
  async getTestStats(testId: number) {
  const test = await this.testRepo.findOne({
    where: { id: testId },
    relations: ['questions', 'submissions', 'submissions.answers'],
  });

  if (!test) throw new NotFoundException('Test not found');

  const submissions = test.submissions ?? [];
  const totalStudents = submissions.length;
  const evaluated = submissions.filter((s) => s.evaluated).length;

  const avgScore =
    totalStudents > 0
      ? submissions.reduce((sum, s) => sum + (s.score || 0), 0) / totalStudents
      : 0;

  const perQuestionStats = test.questions.map((q) => ({
    questionId: q.id,
    questionText: q.questionText,
    attempts: submissions.length,
    marks: q.marks,
  }));

  return {
    testId: test.id,
    title: test.title,
    totalStudents,
    evaluated,
    avgScore,
    perQuestionStats,
  };
}

async updateQuestions(
  testId: number,
  data: {
    add?: Partial<Question>[];
    update?: Partial<Question>[];
    remove?: number[];
  }
) {
  const test = await this.testRepo.findOne({
    where: { id: testId },
    relations: ['questions'],
  });
  if (!test) throw new NotFoundException('Test not found');

  // ✅ Remove questions
  if (data.remove?.length) {
    await this.questionRepo.delete(data.remove);
  }

  // ✅ Update existing questions
  if (data.update?.length) {
    for (const q of data.update) {
      const existing = await this.questionRepo.findOne({ where: { id: q.id } });
      if (!existing) continue;

      Object.assign(existing, q);
      await this.questionRepo.save(existing);
    }
  }

  // ✅ Add new questions
  if (data.add?.length) {
    for (const q of data.add) {
      const newQ = this.questionRepo.create({
        ...q,
        test,
      });
      await this.questionRepo.save(newQ);
    }
  }

  // Return updated test with questions
  return this.testRepo.findOne({
    where: { id: testId },
    relations: ['questions'],
  });
}
async publishTest(testId:number){
  const test=await this.testRepo.findOne({where:{id:testId}});
  if (test) {
    test.ispublished = true;
    await this.testRepo.save(test);
  }
  console.log(test?.id);
  return test;

}
async unpublishTest(testId:number){
  const test=await this.testRepo.findOne({where:{id:testId}});
  if (test) {
    test.ispublished = false;
    await this.testRepo.save(test);
  }
  console.log(test?.id);
  return test;}

  
async getStudentSubmission(userId:string){
  const submissions=await this.submissionRepo.find({where:{studentId:userId},
    relations: [
      'test', 
      'answers', 
      'answers.question', 
      'result'
    ],
    order: { submittedAt: 'DESC' }
});
return submissions;}
  

}
