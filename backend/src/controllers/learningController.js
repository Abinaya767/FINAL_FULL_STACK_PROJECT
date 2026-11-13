import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Assessment from "../models/Assessment.js";
import AssessmentAttempt from "../models/AssessmentAttempt.js";
import Certificate from "../models/Certificate.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Lesson from "../models/Lesson.js";
import Module from "../models/Module.js";
import Notification from "../models/Notification.js";
import Progress from "../models/Progress.js";
import Quiz, { QUIZ_ATTEMPT_LIMIT, QUIZ_COOLDOWN_MS } from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Student from "../models/Student.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { hasCompletedAllLessons } from "../utils/learningValidation.js";
import {
  badRequest,
  conflict,
  notFound,
  requireObjectId,
} from "../utils/mongo.js";

const routeIdPattern = /^[A-Za-z0-9_-]{1,128}$/;

function assertRouteId(id, label) {
  if (typeof id !== "string" || !routeIdPattern.test(id)) {
    throw badRequest(`${label} is invalid.`);
  }
}

async function findCourse(id) {
  assertRouteId(id, "Course ID");
  const clauses = [{ legacyId: id }];
  if (mongoose.isValidObjectId(id)) clauses.push({ _id: id });
  return Course.findOne({ $or: clauses });
}

async function findModule(id, { populate = false } = {}) {
  requireObjectId(id, "Module ID");
  let query = Module.findById(id);
  if (populate) {
    query = query.populate({ path: "lessons", options: { sort: { order: 1 } } })
      .populate("quiz");
  }
  return query;
}

async function currentStudent(request) {
  if (request.user.role !== "student") throw Object.assign(new Error("A student account is required."), { status: 403 });
  const student = await Student.findOne({ user: requireObjectId(request.user.id, "User ID") });
  if (!student) throw notFound("Student profile not found.");
  return student;
}

async function findStudentByIdentifier(id) {
  assertRouteId(id, "Student ID");
  const clauses = [{ legacyId: id }];
  if (mongoose.isValidObjectId(id)) clauses.push({ _id: id });
  const student = await Student.findOne({ $or: clauses });
  if (!student) throw notFound("Student not found.");
  return student;
}

async function authorizeStudentResource(request, studentId) {
  if (request.user.role === "admin") return;
  const student = await currentStudent(request);
  if (student._id.toString() !== studentId.toString()) {
    throw Object.assign(new Error("You may access only your own learning records."), { status: 403 });
  }
}

async function getEnrollmentForStudent(student, course) {
  if (!course) throw notFound("Course not found.");
  const enrollment = await Enrollment.findOne({ student: student._id, course: course._id });
  if (!enrollment) throw Object.assign(new Error("Enroll in this course before accessing its learning content."), { status: 403 });
  if (enrollment.status === "cancelled") {
    throw Object.assign(new Error("This enrollment is cancelled."), { status: 403 });
  }
  return enrollment;
}

function forbidden(message) {
  return Object.assign(new Error(message), { status: 403 });
}

async function requireUnlockedModule(request, module) {
  if (request.user.role === "admin") return null;
  const student = await currentStudent(request);
  await getEnrollmentForStudent(student, await Course.findById(module.course));
  const progress = await Progress.findOne({
    student: student._id,
    course: module.course,
    module: module._id,
  });
  if (!progress) throw forbidden("Learning progress for this module was not found.");
  if (!progress.unlockedAt) {
    throw forbidden("This module is locked until the previous module reaches 100% completion.");
  }
  return progress;
}

async function requireCompletedCourse(request, course) {
  if (request.user.role === "admin") return null;
  const student = await currentStudent(request);
  await getEnrollmentForStudent(student, course);
  const progresses = await Progress.find({ student: student._id, course: course._id });
  const lessons = await Lesson.find({ module: { $in: course.modules } }).select("_id module").lean();
  const lessonsByModule = new Map();
  for (const lesson of lessons) {
    const key = lesson.module.toString();
    const moduleLessons = lessonsByModule.get(key) ?? [];
    moduleLessons.push(lesson._id);
    lessonsByModule.set(key, moduleLessons);
  }
  const allModulesComplete = course.modules.every((moduleId) => {
    const progress = progresses.find((record) => record.module.equals(moduleId));
    return progress?.quizPassed === true
      && hasCompletedAllLessons(
        lessonsByModule.get(moduleId.toString()) ?? [],
        progress.completedLessons,
        progress.completionPercentage,
      );
  });
  if (course.modules.length < 10 || progresses.length !== course.modules.length || !allModulesComplete) {
    throw forbidden("Complete every lesson and pass every module quiz before accessing the final assessment.");
  }
  return { student, progresses };
}

function safeQuestion(question) {
  return {
    id: question._id.toString(),
    question: question.question,
    options: question.options,
  };
}

function scoreAnswers(questions, answers, label) {
  if (!Array.isArray(answers) || answers.length !== questions.length) {
    throw badRequest(`Submit one answer for every ${label} question.`);
  }
  const answerById = new Map();
  for (const answer of answers) {
    if (!answer || !mongoose.isValidObjectId(answer.questionId) || !Number.isInteger(answer.answerIndex)) {
      throw badRequest("Each answer requires a valid questionId and integer answerIndex.");
    }
    if (answerById.has(answer.questionId)) throw badRequest("Each question may be answered only once.");
    answerById.set(answer.questionId, answer.answerIndex);
  }
  let correct = 0;
  for (const question of questions) {
    const answerIndex = answerById.get(question._id.toString());
    if (answerIndex === undefined || answerIndex < 0 || answerIndex >= question.options.length) {
      throw badRequest("Answers must include each question and select one of its options.");
    }
    if (answerIndex === question.correctAnswerIndex) correct += 1;
  }
  return Math.round((correct / questions.length) * 100);
}

function enrollmentDto(enrollment, attempts = []) {
  const course = enrollment.course;
  return {
    id: enrollment._id.toString(),
    studentId: enrollment.student.toString(),
    courseId: course?._id?.toString() ?? enrollment.course.toString(),
    course: course?.title,
    courseTitle: course?.title,
    enrolledAt: enrollment.enrolledAt,
    status: enrollment.status,
    finalAssessmentAttempts: attempts.map((attempt) => ({
      id: attempt._id.toString(),
      attemptedAt: attempt.attemptedAt,
      scorePercentage: attempt.scorePercentage,
      passed: attempt.passed,
      terminated: attempt.terminated === true,
      lockUntil: attempt.lockUntil ?? null,
    })),
  };
}

async function getAssessmentAttemptHistory(enrollmentId) {
  return AssessmentAttempt.find({ enrollment: enrollmentId })
    .sort({ attemptedAt: -1 })
    .limit(100)
    .lean();
}

async function getQuizAttemptHistory(progressId) {
  return QuizAttempt.find({ progress: progressId })
    .sort({ attemptedAt: -1 })
    .limit(100)
    .lean();
}

function progressDto(progress, attemptHistory = []) {
  return {
    id: progress._id.toString(),
    studentId: progress.student.toString(),
    courseId: progress.course.toString(),
    moduleId: progress.module.toString(),
    completionPercentage: progress.completionPercentage,
    status: progress.status,
    unlockedAt: progress.unlockedAt,
    completedLessons: progress.completedLessons.map(String),
    quizPassed: progress.quizPassed,
    quizAttempts: progress.quizAttempts,
    quizAttemptHistory: attemptHistory.map((attempt) => ({
      id: attempt._id.toString(),
      attemptedAt: attempt.attemptedAt,
      scorePercentage: attempt.scorePercentage,
      passed: attempt.passed,
    })),
    lockedUntil: progress.lockedUntil,
    createdAt: progress.createdAt,
    updatedAt: progress.updatedAt,
  };
}

export const getEnrollments = asyncHandler(async (request, response) => {
  let filter = {};
  if (request.user.role === "student") {
    const student = await currentStudent(request);
    if (request.query.studentId) {
      const requested = await findStudentByIdentifier(request.query.studentId);
      if (!requested._id.equals(student._id)) {
        throw Object.assign(new Error("You may access only your own enrollments."), { status: 403 });
      }
    }
    filter.student = student._id;
  } else if (request.query.studentId) {
    filter.student = (await findStudentByIdentifier(request.query.studentId))._id;
  }
  const enrollments = await Enrollment.find(filter).populate("course").sort({ enrolledAt: -1 });
  const attempts = await Promise.all(enrollments.map((enrollment) => getAssessmentAttemptHistory(enrollment._id)));
  response.status(200).json(apiResponse("Enrollments retrieved successfully.", {
    enrollments: enrollments.map((enrollment, index) => enrollmentDto(enrollment, attempts[index])),
  }));
});

export const getEnrollment = asyncHandler(async (request, response) => {
  requireObjectId(request.params.id, "Enrollment ID");
  const enrollment = await Enrollment.findById(request.params.id).populate("course");
  if (!enrollment) throw notFound("Enrollment not found.");
  await authorizeStudentResource(request, enrollment.student);
  const attempts = await getAssessmentAttemptHistory(enrollment._id);
  response.status(200).json(apiResponse("Enrollment retrieved successfully.", {
    enrollment: enrollmentDto(enrollment, attempts),
  }));
});

export const createEnrollment = asyncHandler(async (request, response) => {
  const student = request.user.role === "admin" && request.body.studentId
    ? await findStudentByIdentifier(request.body.studentId)
    : await currentStudent(request);
  const courseIdentifier = request.body.courseId ?? request.body.course;
  if (typeof courseIdentifier !== "string") throw badRequest("courseId is required.");
  const course = await findCourse(courseIdentifier);
  if (!course) throw notFound("Course not found.");
  if (course.modules.length < 10) throw badRequest("The course must contain at least 10 modules before enrollment.");
  if (await Enrollment.exists({ student: student._id, course: course._id })) {
    throw conflict("The student is already enrolled in this course.");
  }

  const modules = await Module.find({ _id: { $in: course.modules }, course: course._id })
    .populate("lessons")
    .populate("quiz")
    .sort({ order: 1 });
  if (modules.length !== course.modules.length) {
    throw badRequest("Course module references are incomplete or invalid.");
  }
  if (modules.some((module) => module.lessons.length === 0 || !module.quiz)) {
    throw badRequest("Every course module must have at least one lesson and a five-question quiz before enrollment.");
  }
  let enrollment;
  try {
    enrollment = await Enrollment.create({ student: student._id, course: course._id });
    await Progress.insertMany(modules.map((module, index) => ({
      student: student._id,
      course: course._id,
      module: module._id,
      unlockedAt: index === 0 ? new Date() : null,
    })));
    student.enrollments.addToSet(enrollment._id);
    await student.save();
  } catch (error) {
    if (enrollment) {
      try {
        await Promise.all([
          Enrollment.deleteOne({ _id: enrollment._id }),
          Progress.deleteMany({ student: student._id, course: course._id }),
          Student.updateOne({ _id: student._id }, { $pull: { enrollments: enrollment._id } }),
        ]);
      } catch (cleanupError) {
        console.error(`Enrollment rollback failed (${cleanupError.name}).`);
      }
    }
    throw error;
  }
  await enrollment.populate("course");
  response.status(201).json(apiResponse("Enrollment created successfully.", { enrollment: enrollmentDto(enrollment) }));
});

export const deleteEnrollment = asyncHandler(async (request, response) => {
  requireObjectId(request.params.id, "Enrollment ID");
  const enrollment = await Enrollment.findById(request.params.id);
  if (!enrollment) throw notFound("Enrollment not found.");
  if (request.user.role !== "admin") {
    const student = await currentStudent(request);
    if (!enrollment.student.equals(student._id)) {
      throw Object.assign(new Error("You may delete only your own enrollment."), { status: 403 });
    }
    throw Object.assign(new Error("Students cannot delete enrollment history."), { status: 403 });
  }
  const dto = enrollmentDto(enrollment);
  const [student] = await Promise.all([
    Student.findById(enrollment.student),
    Progress.deleteMany({ student: enrollment.student, course: enrollment.course }),
    QuizAttempt.deleteMany({ student: enrollment.student, course: enrollment.course }),
    AssessmentAttempt.deleteMany({ enrollment: enrollment._id }),
    Certificate.deleteMany({ student: enrollment.student, course: enrollment.course }),
  ]);
  if (student) {
    student.enrollments.pull(enrollment._id);
    await student.save();
  }
  await enrollment.deleteOne();
  response.status(200).json(apiResponse("Enrollment deleted successfully.", { enrollment: dto }));
});

export const getProgress = asyncHandler(async (request, response) => {
  let filter = {};
  if (request.user.role === "student") {
    const student = await currentStudent(request);
    filter.student = student._id;
  } else {
    if (request.query.studentId) {
      filter.student = (await findStudentByIdentifier(request.query.studentId))._id;
    }
    if (request.query.courseId) {
      const course = await findCourse(request.query.courseId);
      if (!course) throw notFound("Course not found.");
      filter.course = course._id;
    }
  }
  const progress = await Progress.find(filter).sort({ course: 1, module: 1 });
  const attemptHistories = await Promise.all(progress.map((record) => getQuizAttemptHistory(record._id)));
  response.status(200).json(apiResponse("Progress retrieved successfully.", {
    progress: progress.map((record, index) => progressDto(record, attemptHistories[index])),
  }));
});

export const getProgressRecord = asyncHandler(async (request, response) => {
  requireObjectId(request.params.id, "Progress ID");
  const progress = await Progress.findById(request.params.id);
  if (!progress) throw notFound("Progress not found.");
  await authorizeStudentResource(request, progress.student);
  const attemptHistory = await getQuizAttemptHistory(progress._id);
  response.status(200).json(apiResponse("Progress retrieved successfully.", {
    progress: progressDto(progress, attemptHistory),
  }));
});

export const completeLesson = asyncHandler(async (request, response) => {
  requireObjectId(request.params.id, "Progress ID");
  requireObjectId(request.params.lessonId, "Lesson ID");
  const progress = await Progress.findById(request.params.id);
  if (!progress) throw notFound("Progress not found.");
  await authorizeStudentResource(request, progress.student);
  const student = await Student.findById(progress.student);
  await getEnrollmentForStudent(student, await Course.findById(progress.course));
  if (!progress.unlockedAt) throw Object.assign(new Error("This module is locked until the previous module is complete."), { status: 403 });
  const module = await Module.findOne({ _id: progress.module, course: progress.course }).populate("lessons");
  if (!module) throw badRequest("Progress module does not belong to its course.");
  const orderedLessons = [...module.lessons].sort((a, b) => a.order - b.order);
  const lessonIndex = orderedLessons.findIndex((item) => item._id.equals(request.params.lessonId));
  if (lessonIndex < 0) throw notFound("Lesson not found in this module.");
  if (orderedLessons.length === 0) throw badRequest("This module has no lessons to complete.");
  const earlierLessons = orderedLessons.slice(0, lessonIndex);
  const hasFinishedEarlierLessons = earlierLessons.every((earlier) =>
    progress.completedLessons.some((completedId) => completedId.equals(earlier._id))
  );
  if (!hasFinishedEarlierLessons) {
    throw Object.assign(new Error("Complete the previous lesson before completing this lesson."), { status: 403 });
  }
  progress.completedLessons.addToSet(orderedLessons[lessonIndex]._id);
  progress.completionPercentage = Math.floor((progress.completedLessons.length / module.lessons.length) * 100);
  progress.status = progress.completionPercentage === 100 ? "completed" : "in_progress";
  if (progress.completionPercentage === 100) progress.completionPercentage = 100;
  await progress.save();

  response.status(200).json(apiResponse("Lesson completion recorded successfully.", {
    progress: progressDto(progress),
  }));
});

export const getCourseModules = asyncHandler(async (request, response) => {
  const course = await findCourse(request.params.courseId);
  if (!course) throw notFound("Course not found.");
  let progresses = [];
  if (request.user.role !== "admin") {
    const student = await currentStudent(request);
    await getEnrollmentForStudent(student, course);
    progresses = await Progress.find({ student: student._id, course: course._id });
  }
  const progressByModule = new Map(progresses.map((progress) => [progress.module.toString(), progress]));
  const modules = await Module.find({ _id: { $in: course.modules }, course: course._id })
    .populate({ path: "lessons", options: { sort: { order: 1 } } })
    .populate("quiz")
    .sort({ order: 1 });
  const results = modules.map((module) => {
    const progress = progressByModule.get(module._id.toString());
    const unlocked = request.user.role === "admin" || Boolean(progress?.unlockedAt);
    return {
      id: module._id.toString(),
      title: module.title,
      description: module.description,
      order: module.order,
      unlocked,
      ...(progress ? { progress: progressDto(progress) } : {}),
      lessons: unlocked ? module.lessons.map((lesson) => ({
        id: lesson._id.toString(),
        title: lesson.title,
        content: lesson.content,
        order: lesson.order,
      })) : [],
      quiz: unlocked && module.quiz ? {
        id: module.quiz._id.toString(),
        title: module.quiz.title,
        passingPercentage: module.quiz.passingPercentage,
        questions: module.quiz.questions.map((question) => request.user.role === "admin"
          ? { ...safeQuestion(question), correctAnswerIndex: question.correctAnswerIndex }
          : safeQuestion(question)),
      } : null,
    };
  });
  response.status(200).json(apiResponse("Course modules retrieved successfully.", { modules: results }));
});

export const getModule = asyncHandler(async (request, response) => {
  const module = await findModule(request.params.id, { populate: true });
  if (!module) throw notFound("Module not found.");
  await requireUnlockedModule(request, module);
  response.status(200).json(apiResponse("Module retrieved successfully.", {
    module: {
      id: module._id.toString(),
      courseId: module.course.toString(),
      title: module.title,
      description: module.description,
      order: module.order,
      lessons: module.lessons.map((lesson) => ({
        id: lesson._id.toString(), title: lesson.title, content: lesson.content, order: lesson.order,
      })),
      quiz: module.quiz ? {
        id: module.quiz._id.toString(),
        title: module.quiz.title,
        passingPercentage: module.quiz.passingPercentage,
        questions: module.quiz.questions.map(safeQuestion),
      } : null,
    },
  }));
});

export const createModule = asyncHandler(async (request, response) => {
  const course = await findCourse(request.params.courseId);
  if (!course) throw notFound("Course not found.");
  const { title, description = "", order } = request.body ?? {};
  if (typeof title !== "string" || !title.trim()) throw badRequest("Module title is required.");
  const nextOrder = order ?? course.modules.length + 1;
  const module = await Module.create({ course: course._id, title: title.trim(), description, order: nextOrder });
  try {
    course.modules.push(module._id);
    await course.save();
  } catch (error) {
    await Module.deleteOne({ _id: module._id });
    throw error;
  }
  response.status(201).json(apiResponse("Module created successfully.", { module }));
});

export const updateModule = asyncHandler(async (request, response) => {
  requireObjectId(request.params.id, "Module ID");
  const module = await Module.findById(request.params.id);
  if (!module) throw notFound("Module not found.");
  const allowed = ["title", "description", "order"];
  const unknown = Object.keys(request.body ?? {}).filter((field) => !allowed.includes(field));
  if (unknown.length) throw badRequest(`Unsupported module field(s): ${unknown.join(", ")}.`);
  for (const field of allowed) if (request.body[field] !== undefined) module[field] = request.body[field];
  await module.save();
  response.status(200).json(apiResponse("Module updated successfully.", { module }));
});

export const deleteModule = asyncHandler(async (request, response) => {
  requireObjectId(request.params.id, "Module ID");
  const module = await Module.findById(request.params.id).populate("lessons").populate("quiz");
  if (!module) throw notFound("Module not found.");
  const course = await Course.findById(module.course);
  if (!course) throw notFound("Course not found.");
  if (course.modules.length <= 10) throw badRequest("A course must retain at least 10 modules.");
  await Promise.all([
    Lesson.deleteMany({ _id: { $in: module.lessons.map((lesson) => lesson._id) } }),
    module.quiz ? Quiz.deleteOne({ _id: module.quiz._id }) : Promise.resolve(),
    Progress.deleteMany({ module: module._id }),
    QuizAttempt.deleteMany({ module: module._id }),
  ]);
  course.modules.pull(module._id);
  await course.save();
  await module.deleteOne();
  response.status(200).json(apiResponse("Module deleted successfully.", { id: module._id.toString() }));
});

export const getModuleLessons = asyncHandler(async (request, response) => {
  requireObjectId(request.params.moduleId, "Module ID");
  const module = await Module.findById(request.params.moduleId);
  if (!module) throw notFound("Module not found.");
  await requireUnlockedModule(request, module);
  const lessons = await Lesson.find({ module: module._id }).sort({ order: 1 });
  response.status(200).json(apiResponse("Lessons retrieved successfully.", { lessons }));
});

export const getLesson = asyncHandler(async (request, response) => {
  requireObjectId(request.params.id, "Lesson ID");
  const lesson = await Lesson.findById(request.params.id);
  if (!lesson) throw notFound("Lesson not found.");
  const module = await Module.findById(lesson.module);
  if (!module) throw notFound("Module not found.");
  await requireUnlockedModule(request, module);
  response.status(200).json(apiResponse("Lesson retrieved successfully.", { lesson }));
});

export const createLesson = asyncHandler(async (request, response) => {
  requireObjectId(request.params.moduleId, "Module ID");
  const module = await Module.findById(request.params.moduleId);
  if (!module) throw notFound("Module not found.");
  const { title, content, order = module.lessons.length + 1 } = request.body ?? {};
  if (typeof title !== "string" || !title.trim() || typeof content !== "string" || !content.trim()) {
    throw badRequest("Lesson title and content are required.");
  }
  const lesson = await Lesson.create({ module: module._id, title: title.trim(), content, order });
  try {
    module.lessons.push(lesson._id);
    await module.save();
    await recalculateProgressForModule(module._id);
  } catch (error) {
    await Lesson.deleteOne({ _id: lesson._id });
    throw error;
  }
  response.status(201).json(apiResponse("Lesson created successfully.", { lesson }));
});

export const updateLesson = asyncHandler(async (request, response) => {
  requireObjectId(request.params.id, "Lesson ID");
  const lesson = await Lesson.findById(request.params.id);
  if (!lesson) throw notFound("Lesson not found.");
  const allowedFields = new Set(["title", "content", "order"]);
  const unknownFields = Object.keys(request.body ?? {}).filter((field) => !allowedFields.has(field));
  if (unknownFields.length) throw badRequest(`Unsupported lesson field(s): ${unknownFields.join(", ")}.`);
  const contentChanged = request.body?.content !== undefined && request.body.content !== lesson.content;
  for (const field of ["title", "content", "order"]) {
    if (request.body?.[field] !== undefined) lesson[field] = request.body[field];
  }
  await lesson.save();
  if (contentChanged) {
    await Progress.updateMany(
      { module: lesson.module },
      { $pull: { completedLessons: lesson._id } },
    );
    await recalculateProgressForModule(lesson.module);
  }
  response.status(200).json(apiResponse("Lesson updated successfully.", { lesson }));
});

export const deleteLesson = asyncHandler(async (request, response) => {
  requireObjectId(request.params.id, "Lesson ID");
  const lesson = await Lesson.findById(request.params.id);
  if (!lesson) throw notFound("Lesson not found.");
  const [module] = await Promise.all([
    Module.findById(lesson.module),
    Progress.updateMany(
      { module: lesson.module },
      { $pull: { completedLessons: lesson._id } },
    ),
  ]);
  if (module) {
    module.lessons.pull(lesson._id);
    await module.save();
  }
  await lesson.deleteOne();
  await recalculateProgressForModule(lesson.module);
  response.status(200).json(apiResponse("Lesson deleted successfully.", { id: lesson._id.toString() }));
});

async function recalculateProgressForModule(moduleId) {
  const module = await Module.findById(moduleId).populate("lessons");
  if (!module) return;
  const records = await Progress.find({ module: moduleId });
  for (const progress of records) {
    progress.completedLessons = progress.completedLessons.filter((id) => module.lessons.some((lesson) => lesson._id.equals(id)));
    progress.completionPercentage = module.lessons.length
      ? Math.floor((progress.completedLessons.length / module.lessons.length) * 100)
      : 0;
    progress.status = progress.completionPercentage === 100 ? "completed" : progress.completionPercentage ? "in_progress" : "not_started";
    await progress.save();
  }
  if (records.some((progress) => progress.completionPercentage !== 100)) {
    const laterModules = await Module.find({ course: module.course, order: { $gt: module.order } }).select("_id");
    await Progress.updateMany(
      { module: { $in: laterModules.map((item) => item._id) } },
      { $set: { unlockedAt: null } },
    );
  }
}

export const getModuleQuiz = asyncHandler(async (request, response) => {
  const module = await findModule(request.params.moduleId);
  if (!module) throw notFound("Module not found.");
  await requireUnlockedModule(request, module);
  if (!module.quiz) throw notFound("Quiz not found.");
  const quiz = await Quiz.findById(module.quiz);
  response.status(200).json(apiResponse("Quiz retrieved successfully.", {
    quiz: {
      id: quiz._id.toString(),
      moduleId: quiz.module.toString(),
      title: quiz.title,
      passingPercentage: quiz.passingPercentage,
      questions: quiz.questions.map(safeQuestion),
    },
  }));
});

export const createModuleQuiz = asyncHandler(async (request, response) => {
  const module = await findModule(request.params.moduleId);
  if (!module) throw notFound("Module not found.");
  if (module.quiz) throw conflict("This module already has a quiz.");
  const quiz = await Quiz.create({
    module: module._id,
    title: typeof request.body?.title === "string" && request.body.title.trim()
      ? request.body.title.trim()
      : `${module.title} Quiz`,
    passingPercentage: request.body?.passingPercentage ?? 50,
    questions: request.body?.questions,
  });
  module.quiz = quiz._id;
  await module.save();
  response.status(201).json(apiResponse("Quiz created successfully.", {
    quiz: {
      id: quiz._id.toString(),
      moduleId: module._id.toString(),
      title: quiz.title,
      passingPercentage: quiz.passingPercentage,
      questions: quiz.questions.map(safeQuestion),
    },
  }));
});

export const updateModuleQuiz = asyncHandler(async (request, response) => {
  const module = await findModule(request.params.moduleId);
  if (!module?.quiz) throw notFound("Quiz not found.");
  const quiz = await Quiz.findByIdAndUpdate(
    module.quiz,
    { $set: {
      title: request.body?.title,
      passingPercentage: request.body?.passingPercentage,
      questions: request.body?.questions,
    } },
    { returnDocument: "after", runValidators: true },
  );
  await Progress.updateMany(
    { module: module._id },
    { $set: { quizPassed: false, quizAttempts: [], lockedUntil: null } },
  );
  const laterModules = await Module.find({ course: module.course, order: { $gt: module.order } }).select("_id");
  if (laterModules.length) {
    await Progress.updateMany(
      { module: { $in: laterModules.map((item) => item._id) } },
      { $set: { unlockedAt: null } },
    );
  }
  response.status(200).json(apiResponse("Quiz updated. Student attempts for this module have been reset.", {
    quiz: {
      id: quiz._id.toString(),
      moduleId: module._id.toString(),
      title: quiz.title,
      passingPercentage: quiz.passingPercentage,
      questions: quiz.questions.map(safeQuestion),
    },
  }));
});

export const deleteModuleQuiz = asyncHandler(async (request, response) => {
  const module = await findModule(request.params.moduleId);
  if (!module?.quiz) throw notFound("Quiz not found.");
  await Quiz.deleteOne({ _id: module.quiz });
  module.quiz = null;
  await module.save();
  response.status(200).json(apiResponse("Quiz deleted successfully.", {}));
});

export const submitModuleQuiz = asyncHandler(async (request, response) => {
  const student = await currentStudent(request);
  const module = await findModule(request.params.moduleId);
  if (!module) throw notFound("Module not found.");
  await getEnrollmentForStudent(student, await Course.findById(module.course));
  const progress = await Progress.findOne({ student: student._id, course: module.course, module: module._id });
  if (!progress) throw notFound("Progress record not found.");
  if (!progress.unlockedAt) throw Object.assign(new Error("This module is locked until the previous module reaches 100% completion."), { status: 403 });
  if (progress.quizPassed) throw conflict("This module quiz has already been passed.");

  const moduleLessons = await Lesson.find({ module: module._id }).select("_id").lean();
  if (!hasCompletedAllLessons(
    moduleLessons.map((lesson) => lesson._id),
    progress.completedLessons,
    progress.completionPercentage,
  )) {
    throw forbidden("Complete every lesson in this module before submitting its quiz.");
  }

  const quiz = await Quiz.findById(module.quiz);
  if (!quiz) throw notFound("Quiz not found.");

  const scorePercentage = scoreAnswers(quiz.questions, request.body?.answers, "quiz");
  const passed = scorePercentage >= quiz.passingPercentage;
  const now = new Date();
  const attemptId = new mongoose.Types.ObjectId();
  const attempt = {
    _id: attemptId,
    student: student._id,
    course: module.course,
    module: module._id,
    quiz: quiz._id,
    progress: progress._id,
    attemptedAt: now,
    scorePercentage,
    passed,
  };
  // Reset an expired 24-hour attempt window before accepting a new attempt.
  // This is a single-document update and does not require MongoDB transactions.
  if (progress.lockedUntil && progress.lockedUntil <= now) {
    await Progress.updateOne(
      { _id: progress._id, lockedUntil: { $lte: now } },
      { $set: { quizAttempts: [], lockedUntil: null } },
    );
  }

  const latestProgress = await Progress.findById(progress._id);
  if (!latestProgress) throw notFound("Progress record not found.");
  if (latestProgress.quizPassed) throw conflict("This module quiz has already been passed.");
  if (latestProgress.lockedUntil && latestProgress.lockedUntil > now) {
    throw Object.assign(new Error(`This quiz is locked until ${latestProgress.lockedUntil.toISOString()}.`), { status: 423 });
  }

  const attemptsBeforeSubmit = latestProgress.quizAttempts.length;
  if (attemptsBeforeSubmit >= QUIZ_ATTEMPT_LIMIT) {
    throw Object.assign(new Error("This quiz is locked until its 24-hour cooldown expires."), { status: 423 });
  }

  // Compare the observed attempt count in the update filter. Concurrent
  // submissions cannot both consume the same remaining attempt.
  const updatedProgress = await Progress.findOneAndUpdate(
    {
      _id: latestProgress._id,
      student: student._id,
      course: module.course,
      module: module._id,
      unlockedAt: { $ne: null },
      quizPassed: { $ne: true },
      lockedUntil: null,
      $expr: {
        $eq: [
          { $size: { $ifNull: ["$quizAttempts", []] } },
          attemptsBeforeSubmit,
        ],
      },
    },
    {
      $push: {
        quizAttempts: {
          attemptedAt: now,
          scorePercentage,
          passed,
        },
      },
      $set: {
        quizPassed: passed,
        lockedUntil: !passed && attemptsBeforeSubmit + 1 >= QUIZ_ATTEMPT_LIMIT
          ? new Date(now.getTime() + QUIZ_COOLDOWN_MS)
          : null,
        updatedAt: now,
      },
    },
    { new: true, runValidators: true },
  );

  if (updatedProgress) {
    // The Progress document is the authoritative attempt record. The
    // separate history collection is supplementary and must not invalidate
    // a quiz result if its write fails.
    try {
      await QuizAttempt.create(attempt);
    } catch (historyError) {
      console.error("Quiz attempt history could not be saved:", historyError?.stack || historyError);
    }
  }

  if (!updatedProgress) {
    const latestProgress = await Progress.findById(progress._id);
    if (!latestProgress) throw notFound("Progress record not found.");
    if (latestProgress.lockedUntil && latestProgress.lockedUntil > new Date()) {
      throw Object.assign(new Error(`This quiz is locked until ${latestProgress.lockedUntil.toISOString()}.`), { status: 423 });
    }
    if (latestProgress.quizPassed) throw conflict("This module quiz has already been passed.");
    if (latestProgress.quizAttempts.length >= QUIZ_ATTEMPT_LIMIT) {
      throw Object.assign(new Error("This quiz is locked until its 24-hour cooldown expires."), { status: 423 });
    }
    throw conflict("The quiz attempt could not be accepted. Refresh progress and try again.");
  }

  if (passed) {
    const modules = await Module.find({ course: module.course }).sort({ order: 1 }).select("_id");
    const position = modules.findIndex((item) => item._id.equals(module._id));
    if (position >= 0 && position + 1 < modules.length) {
      await Progress.updateOne(
        { student: student._id, course: module.course, module: modules[position + 1]._id, unlockedAt: null },
        { $set: { unlockedAt: new Date() } },
      );
    }
  }

  response.status(200).json(apiResponse(passed ? "Quiz passed. The next module is now unlocked." : "Quiz attempt recorded.", {
    scorePercentage,
    correctAnswers: Math.round((scorePercentage / 100) * quiz.questions.length),
    totalQuestions: quiz.questions.length,
    passed,
    attemptsRemaining: passed ? 0 : Math.max(0, QUIZ_ATTEMPT_LIMIT - updatedProgress.quizAttempts.length),
    lockedUntil: updatedProgress.lockedUntil,
  }));
});

export const getCourseAssessment = asyncHandler(async (request, response) => {
  const course = await findCourse(request.params.courseId);
  if (!course) throw notFound("Course not found.");
  await requireCompletedCourse(request, course);
  const assessment = await Assessment.findOne({ course: course._id });
  if (!assessment) throw notFound("Assessment not found.");
  response.status(200).json(apiResponse("Assessment retrieved successfully.", {
    assessment: {
      id: assessment._id.toString(),
      courseId: course._id.toString(),
      questions: assessment.questions.map(safeQuestion),
      totalQuestions: assessment.totalQuestions,
      passingPercentage: assessment.passingPercentage,
    },
  }));
});

export const createCourseAssessment = asyncHandler(async (request, response) => {
  const course = await findCourse(request.params.courseId);
  if (!course) throw notFound("Course not found.");
  if (await Assessment.exists({ course: course._id })) throw conflict("This course already has a final assessment.");
  const assessment = await Assessment.create({
    course: course._id,
    questions: request.body?.questions,
    totalQuestions: request.body?.totalQuestions,
    passingPercentage: request.body?.passingPercentage ?? 50,
  });
  response.status(201).json(apiResponse("Assessment created successfully.", {
    assessment: { id: assessment._id.toString(), courseId: course._id.toString(), totalQuestions: assessment.totalQuestions },
  }));
});

export const updateCourseAssessment = asyncHandler(async (request, response) => {
  const course = await findCourse(request.params.courseId);
  if (!course) throw notFound("Course not found.");
  const allowedFields = new Set(["questions", "totalQuestions", "passingPercentage"]);
  const unknownFields = Object.keys(request.body ?? {}).filter((field) => !allowedFields.has(field));
  if (unknownFields.length) throw badRequest(`Unsupported assessment field(s): ${unknownFields.join(", ")}.`);
  const assessment = await Assessment.findOne({ course: course._id });
  if (!assessment) throw notFound("Assessment not found.");
  for (const field of allowedFields) {
    if (request.body[field] !== undefined) assessment[field] = request.body[field];
  }
  await assessment.save();
  response.status(200).json(apiResponse("Assessment updated successfully.", {
    assessment: { id: assessment._id.toString(), courseId: course._id.toString(), totalQuestions: assessment.totalQuestions },
  }));
});

export const deleteCourseAssessment = asyncHandler(async (request, response) => {
  const course = await findCourse(request.params.courseId);
  if (!course) throw notFound("Course not found.");
  const result = await Assessment.deleteOne({ course: course._id });
  if (!result.deletedCount) throw notFound("Assessment not found.");
  response.status(200).json(apiResponse("Assessment deleted successfully.", {}));
});

export const submitFinalAssessment = asyncHandler(async (request, response) => {
  const student = await currentStudent(request);
  const course = await findCourse(request.params.courseId);
  if (!course) throw notFound("Course not found.");
  const completed = await requireCompletedCourse(request, course);
  const progresses = completed.progresses;
  const enrollment = await getEnrollmentForStudent(student, course);
  const assessment = await Assessment.findOne({ course: course._id });
  if (!assessment) throw notFound("Assessment not found.");

  const history = await AssessmentAttempt.find({
    enrollment: enrollment._id,
    assessment: assessment._id,
  }).sort({ attemptedAt: -1 }).limit(100).lean();
  if (history.some((attempt) => attempt.passed)) {
    throw conflict("You have already passed this final assessment. Your certificate is available.");
  }

  const now = new Date();
  const activeCooldown = history.find((attempt) => attempt.lockUntil && new Date(attempt.lockUntil) > now);
  if (activeCooldown) {
    throw forbidden(`Final assessment is locked until ${new Date(activeCooldown.lockUntil).toISOString()}.`);
  }
  // Use the latest completed cooldown marker so a new attempt starts a clean window.
  const latestCooldown = history.find((attempt) => attempt.lockUntil);
  const windowAttempts = latestCooldown && new Date(latestCooldown.lockUntil) <= now
    ? history.filter((attempt) => new Date(attempt.attemptedAt) > new Date(latestCooldown.lockUntil))
    : history;

  if (windowAttempts.length >= 2) {
    const lockUntil = new Date(new Date(windowAttempts[0].attemptedAt).getTime() + 24 * 60 * 60 * 1000);
    throw forbidden(`Final assessment is locked until ${lockUntil.toISOString()}.`);
  }

  const nextAttemptNumber = windowAttempts.length + 1;
  const lockUntilForFailure = nextAttemptNumber >= 2
    ? new Date(Date.now() + 24 * 60 * 60 * 1000)
    : null;

  if (request.body?.terminated === true) {
    const now = new Date();
    await AssessmentAttempt.create({
      enrollment: enrollment._id,
      student: student._id,
      course: course._id,
      assessment: assessment._id,
      attemptedAt: now,
      scorePercentage: 0,
      passed: false,
      terminated: true,
      lockUntil: lockUntilForFailure,
    });
    response.status(200).json(apiResponse(
      lockUntilForFailure
        ? "Both final assessment attempts are used. Locked for 24 hours."
        : "Final assessment terminated. One more attempt is available.",
      {
        scorePercentage: 0,
        passed: false,
        terminated: true,
        attemptsRemaining: Math.max(0, 2 - nextAttemptNumber),
        lockUntil: lockUntilForFailure,
        certificate: null,
      },
    ));
    return;
  }

  const scorePercentage = scoreAnswers(assessment.questions, request.body?.answers, "assessment");
  const passed = scorePercentage >= assessment.passingPercentage;
  await AssessmentAttempt.create({
    enrollment: enrollment._id,
    student: student._id,
    course: course._id,
    assessment: assessment._id,
    attemptedAt: new Date(),
    scorePercentage,
    passed,
    lockUntil: !passed ? lockUntilForFailure : null,
  });

  if (passed) {
    await Enrollment.updateOne(
      { _id: enrollment._id },
      { $set: { status: "completed" } },
    );
  }

  let certificate = null;
  if (passed && progresses.every((progress) => progress.completionPercentage === 100)) {
    certificate = await Certificate.findOne({ student: student._id, course: course._id });
    if (!certificate) {
      try {
        certificate = await Certificate.create({
          student: student._id,
          course: course._id,
          issuedAt: new Date(),
          certificateId: randomUUID(),
          eligibilityStatus: "issued",
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        certificate = await Certificate.findOne({ student: student._id, course: course._id });
        if (!certificate) throw error;
      }
    } else if (certificate.eligibilityStatus !== "issued") {
      certificate.issuedAt = new Date();
      certificate.certificateId = randomUUID();
      certificate.eligibilityStatus = "issued";
      await certificate.save();
    }
  }

  response.status(200).json(apiResponse(passed ? "Final assessment passed." : "Final assessment attempt recorded.", {
    scorePercentage,
    passed,
    attemptsRemaining: passed ? 0 : Math.max(0, 2 - nextAttemptNumber),
    lockUntil: !passed ? lockUntilForFailure : null,
    certificate: certificate ? {
      id: certificate.certificateId,
      issuedAt: certificate.issuedAt,
      eligibilityStatus: certificate.eligibilityStatus,
    } : null,
  }));
});

export const getCertificates = asyncHandler(async (request, response) => {
  const filter = {};
  if (request.user.role === "student") filter.student = (await currentStudent(request))._id;
  else if (request.query.studentId) filter.student = (await findStudentByIdentifier(request.query.studentId))._id;
  const certificates = await Certificate.find(filter).populate("course").sort({ issuedAt: -1 });
  response.status(200).json(apiResponse("Certificates retrieved successfully.", {
    certificates: certificates.map((certificate) => ({
      id: certificate.certificateId,
      certificateId: certificate.certificateId,
      studentId: certificate.student.toString(),
      courseId: certificate.course?._id.toString(),
      course: certificate.course?.title,
      issuedAt: certificate.issuedAt,
      eligibilityStatus: certificate.eligibilityStatus,
    })),
  }));
});

export const getCertificate = asyncHandler(async (request, response) => {
  requireObjectId(request.params.id, "Certificate ID");
  const certificate = await Certificate.findById(request.params.id).populate("course");
  if (!certificate) throw notFound("Certificate not found.");
  await authorizeStudentResource(request, certificate.student);
  response.status(200).json(apiResponse("Certificate retrieved successfully.", {
    certificate: {
      id: certificate.certificateId,
      certificateId: certificate.certificateId,
      courseId: certificate.course?._id.toString(),
      course: certificate.course?.title,
      issuedAt: certificate.issuedAt,
      eligibilityStatus: certificate.eligibilityStatus,
    },
  }));
});

export const getNotifications = asyncHandler(async (request, response) => {
  let filter;
  if (request.user.role === "admin") {
    filter = { recipientUser: request.user.id };
  } else {
    const student = await currentStudent(request);
    filter = {
      $or: [
        { recipientUser: request.user.id },
        { student: student._id, recipientUser: { $exists: false } },
      ],
    };
  }
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(200);
  response.status(200).json(apiResponse("Notifications retrieved successfully.", { notifications }));
});

export const getNotification = asyncHandler(async (request, response) => {
  requireObjectId(request.params.id, "Notification ID");
  const notification = await Notification.findById(request.params.id);
  if (!notification) throw notFound("Notification not found.");
  await authorizeNotificationRecipient(request, notification);
  response.status(200).json(apiResponse("Notification retrieved successfully.", { notification }));
});

export const createNotification = asyncHandler(async (request, response) => {
  const student = await findStudentByIdentifier(request.body?.studentId);
  const { title, message } = request.body ?? {};
  if (typeof title !== "string" || !title.trim() || typeof message !== "string" || !message.trim()) {
    throw badRequest("Notification title and message are required.");
  }
  const recipient = await Student.findById(student._id).select("user").lean();
  const notification = await Notification.create({
    student: student._id,
    recipientUser: recipient?.user,
    title: title.trim(),
    message: message.trim(),
    type: "general",
  });
  if (recipient?.user) {
    request.app.get("io")?.to(`user:${recipient.user.toString()}`).emit("notification:new", notification);
  }
  response.status(201).json(apiResponse("Notification created successfully.", { notification }));
});

async function authorizeNotificationRecipient(request, notification) {
  if (notification.recipientUser) {
    if (notification.recipientUser.toString() !== request.user.id) {
      throw Object.assign(new Error("You may access only your own notifications."), { status: 403 });
    }
    return;
  }
  if (request.user.role === "admin") return;
  await authorizeStudentResource(request, notification.student);
}

export const markNotificationRead = asyncHandler(async (request, response) => {
  requireObjectId(request.params.id, "Notification ID");
  const notification = await Notification.findById(request.params.id);
  if (!notification) throw notFound("Notification not found.");
  await authorizeNotificationRecipient(request, notification);
  notification.isRead = true;
  await notification.save();
  response.status(200).json(apiResponse("Notification marked as read.", { notification }));
});

export const deleteNotification = asyncHandler(async (request, response) => {
  requireObjectId(request.params.id, "Notification ID");
  const notification = await Notification.findById(request.params.id);
  if (!notification) throw notFound("Notification not found.");
  await authorizeNotificationRecipient(request, notification);
  await notification.deleteOne();
  response.status(200).json(apiResponse("Notification deleted successfully.", { id: request.params.id }));
});
