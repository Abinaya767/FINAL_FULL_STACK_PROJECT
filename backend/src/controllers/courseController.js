import mongoose from "mongoose";
import Assessment from "../models/Assessment.js";
import AssessmentAttempt from "../models/AssessmentAttempt.js";
import Certificate from "../models/Certificate.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Lesson from "../models/Lesson.js";
import Module from "../models/Module.js";
import Progress from "../models/Progress.js";
import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Student from "../models/Student.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { badRequest, conflict, notFound } from "../utils/mongo.js";

const routeIdPattern = /^[A-Za-z0-9_-]{1,128}$/;
const publicQuestion = (question) => ({
  id: question._id.toString(),
  question: question.question,
  options: question.options,
});

function assertCourseId(id) {
  if (!routeIdPattern.test(id)) throw badRequest("Course ID is invalid.");
}

function courseDto(course, { includeModules = false } = {}) {
  const dto = {
    id: course.legacyId || course._id.toString(),
    title: course.title,
    description: course.description,
    category: course.category,
    duration: course.duration ?? "",
    level: course.level ?? "Not specified",
    instructor: course.instructor,
    demo: Boolean(course.demo),
  };
  if (includeModules) {
    dto.modules = (course.modules ?? []).map((module) => ({
      id: module._id.toString(),
      title: module.title,
      description: module.description ?? "",
      order: module.order,
      lessons: (module.lessons ?? []).map((lesson) => ({
        id: lesson._id.toString(),
        title: lesson.title,
        content: lesson.content,
        order: lesson.order,
      })),
      quiz: module.quiz
        ? {
          id: module.quiz._id.toString(),
          questions: module.quiz.questions.map(publicQuestion),
        }
        : null,
    }));
  }
  return dto;
}

async function findCourse(id, { populate = false } = {}) {
  assertCourseId(id);
  const alternatives = [{ legacyId: id }];
  if (mongoose.isValidObjectId(id)) alternatives.push({ _id: id });
  let query = Course.findOne({ $or: alternatives });
  if (populate) {
    query = query.populate({
      path: "modules",
      options: { sort: { order: 1 } },
      populate: [
        { path: "lessons", options: { sort: { order: 1 } } },
        { path: "quiz" },
      ],
    });
  }
  return query;
}

function normalizeCourse(body, { partial = false, requireModules = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Request body must be a JSON object.");
  }
  const allowed = new Set([
    "id", "title", "description", "category", "duration", "level", "instructor", "modules", "demo",
  ]);
  const unknown = Object.keys(body).filter((field) => !allowed.has(field));
  if (unknown.length) throw badRequest(`Unsupported course field(s): ${unknown.join(", ")}.`);
  const fields = {};
  if (body.id !== undefined) {
    if (typeof body.id !== "string" || !routeIdPattern.test(body.id)) {
      throw badRequest("Course ID must contain 1 to 128 letters, numbers, underscores, or hyphens.");
    }
    fields.legacyId = body.id;
  }
  for (const field of ["title", "description", "category", "duration", "level", "instructor"]) {
    if (body[field] === undefined) {
      if (!partial && field !== "instructor") throw badRequest(`Course ${field} is required.`);
      continue;
    }
    const maxLength = field === "description" ? 10000 : field === "title" || field === "instructor" ? 200 : 100;
    if (typeof body[field] !== "string" || !body[field].trim() || body[field].length > maxLength) {
      throw badRequest(`Course ${field} must be a non-empty string of at most ${maxLength} characters.`);
    }
    fields[field] = body[field].trim();
  }
  if (!partial && typeof body.instructor !== "string") {
    throw badRequest("Course instructor is required.");
  }
  if (body.demo !== undefined) {
    if (typeof body.demo !== "boolean") throw badRequest("Course demo must be a boolean.");
    fields.demo = body.demo;
  }
  if (body.modules !== undefined) {
    if (!Array.isArray(body.modules) || body.modules.length < 10) {
      throw badRequest("A course must include at least 10 modules.");
    }
    fields.modules = body.modules;
  } else if (requireModules) {
    throw badRequest("A new course must include at least 10 modules.");
  }
  if (partial && !Object.keys(fields).some((field) => !["legacyId"].includes(field))) {
    throw badRequest("Provide at least one course field to update.");
  }
  return fields;
}

function normalizeModule(module, index) {
  if (!module || typeof module !== "object" || Array.isArray(module)) {
    throw badRequest(`Module ${index + 1} must be an object.`);
  }
  if (typeof module.title !== "string" || !module.title.trim()) {
    throw badRequest(`Module ${index + 1} title is required.`);
  }
  const lessons = module.lessons ?? [];
  if (!Array.isArray(lessons)) throw badRequest(`Module ${index + 1} lessons must be an array.`);
  if (lessons.length === 0) {
    throw badRequest(`Module ${index + 1} must contain at least one lesson.`);
  }
  const questions = module.quiz?.questions;
  if (!Array.isArray(questions) || questions.length !== 5) {
    throw badRequest(`Module ${index + 1} quiz must contain exactly 5 questions.`);
  }
  questions.forEach((question, questionIndex) => {
    if (!question || typeof question.question !== "string" || !question.question.trim()) {
      throw badRequest(`Question ${questionIndex + 1} in module ${index + 1} needs a question prompt.`);
    }
    if (!Array.isArray(question.options) || question.options.length !== 4
      || question.options.some((option) => typeof option !== "string" || !option.trim())) {
      throw badRequest(`Question ${questionIndex + 1} in module ${index + 1} must have exactly four non-empty options.`);
    }
    if (!Number.isInteger(question.correctAnswerIndex)
      || question.correctAnswerIndex < 0 || question.correctAnswerIndex > 3) {
      throw badRequest(`Question ${questionIndex + 1} in module ${index + 1} must have a correctAnswerIndex from 0 to 3.`);
    }
  });
  return { ...module, lessons, questions };
}

async function createCourseModules(course, inputModules) {
  const createdModuleIds = [];
  const createdLessonIds = [];
  const createdQuizIds = [];
  try {
    for (let index = 0; index < inputModules.length; index += 1) {
      const input = normalizeModule(inputModules[index], index);
      const moduleId = course.modules[index];
      const lessonIds = input.lessons.map(() => new mongoose.Types.ObjectId());
      createdLessonIds.push(...lessonIds);
      const quizId = new mongoose.Types.ObjectId();
      const module = await Module.create({
        _id: moduleId,
        course: course._id,
        title: input.title.trim(),
        description: typeof input.description === "string" ? input.description.trim() : "",
        order: Number.isInteger(input.order) && input.order > 0 ? input.order : index + 1,
        lessons: lessonIds,
        quiz: quizId,
      });
      createdModuleIds.push(module._id);

      const lessons = input.lessons.map((lesson, lessonIndex) => {
        if (!lesson || typeof lesson.title !== "string" || typeof lesson.content !== "string") {
          throw badRequest(`Lesson ${lessonIndex + 1} in module ${index + 1} requires a title and content.`);
        }
        return {
          _id: lessonIds[lessonIndex],
          module: module._id,
          title: lesson.title.trim(),
          content: lesson.content,
          order: Number.isInteger(lesson.order) && lesson.order > 0 ? lesson.order : lessonIndex + 1,
        };
      });
      if (lessons.length) {
        await Lesson.insertMany(lessons, { ordered: true });
      }

      const quiz = new Quiz({ _id: quizId, module: module._id, questions: input.questions });
      createdQuizIds.push(quiz._id);
      await quiz.save();
    }
    await course.save();
    return { createdModuleIds, createdLessonIds, createdQuizIds };
  } catch (error) {
    try {
      await Promise.all([
        Module.deleteMany({ _id: { $in: createdModuleIds } }),
        Lesson.deleteMany({ _id: { $in: createdLessonIds } }),
        Quiz.deleteMany({ _id: { $in: createdQuizIds } }),
        Course.deleteOne({ _id: course._id }),
      ]);
    } catch (cleanupError) {
      console.error(`Course creation rollback failed (${cleanupError.name}).`);
    }
    throw error;
  }
}

export const getCourses = asyncHandler(async (_request, response) => {
  const courses = await Course.find().sort({ createdAt: -1 });
  response.status(200).json(apiResponse("Courses retrieved successfully.", {
    courses: courses.map((course) => courseDto(course)),
  }));
});

export const getCourse = asyncHandler(async (request, response) => {
  const course = await findCourse(request.params.id);
  if (!course) throw notFound("Course not found.");
  response.status(200).json(apiResponse("Course retrieved successfully.", {
    course: courseDto(course),
  }));
});

export const createCourse = asyncHandler(async (request, response) => {
  const fields = normalizeCourse(request.body, { requireModules: true });
  if (fields.legacyId && await Course.exists({ legacyId: fields.legacyId })) {
    throw conflict("A course with this ID already exists.");
  }
  const course = new Course({
    legacyId: fields.legacyId,
    title: fields.title,
    description: fields.description,
    category: fields.category,
    duration: fields.duration,
    level: fields.level,
    instructor: fields.instructor,
    demo: fields.demo ?? false,
    modules: [],
  });
  const moduleInputs = fields.modules.map(normalizeModule);
  course.modules = moduleInputs.map(() => new mongoose.Types.ObjectId());
  await course.validate();
  await course.save();
  await createCourseModules(course, moduleInputs);
  const created = await findCourse(course._id.toString(), { populate: true });
  response.status(201).json(apiResponse("Course created successfully.", {
    course: courseDto(created, { includeModules: true }),
  }));
});

async function updateCourseRecord(request, response, partial) {
  const course = await findCourse(request.params.id);
  if (!course) throw notFound("Course not found.");
  const fields = normalizeCourse(request.body, { partial });
  if (fields.legacyId) throw badRequest("Course ID cannot be changed.");
  if (fields.modules) {
    throw badRequest("Course modules must be managed through module endpoints.");
  }
  for (const field of ["title", "description", "category", "duration", "level", "instructor", "demo"]) {
    if (fields[field] !== undefined) course[field] = fields[field];
  }
  await course.save();
  response.status(200).json(apiResponse("Course updated successfully.", {
    course: courseDto(course),
  }));
}

export const updateCourse = asyncHandler((request, response) => updateCourseRecord(request, response, false));
export const patchCourse = asyncHandler((request, response) => updateCourseRecord(request, response, true));

export const deleteCourse = asyncHandler(async (request, response) => {
  const course = await findCourse(request.params.id, { populate: true });
  if (!course) throw notFound("Course not found.");
  const ids = course.modules.map((module) => module._id);
  const moduleQuizIds = course.modules.map((module) => module.quiz?._id).filter(Boolean);
  const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson._id));
  const enrollments = await Enrollment.find({ course: course._id }).select("_id student");
  const enrollmentIdsByStudent = new Map();
  for (const enrollment of enrollments) {
    const key = enrollment.student.toString();
    const idsForStudent = enrollmentIdsByStudent.get(key) ?? [];
    idsForStudent.push(enrollment._id);
    enrollmentIdsByStudent.set(key, idsForStudent);
  }
  for (const [studentId, enrollmentIds] of enrollmentIdsByStudent) {
    await Student.updateOne(
      { _id: studentId },
      { $pull: { enrollments: { $in: enrollmentIds } } },
    );
  }
  const dto = courseDto(course, { includeModules: true });
  await Promise.all([
    Enrollment.deleteMany({ course: course._id }),
    AssessmentAttempt.deleteMany({ course: course._id }),
    Progress.deleteMany({ course: course._id }),
    QuizAttempt.deleteMany({ course: course._id }),
    Assessment.deleteMany({ course: course._id }),
    Certificate.deleteMany({ course: course._id }),
    Lesson.deleteMany({ _id: { $in: lessonIds } }),
    Quiz.deleteMany({ _id: { $in: moduleQuizIds } }),
    Module.deleteMany({ _id: { $in: ids } }),
  ]);
  await course.deleteOne();
  response.status(200).json(apiResponse("Course deleted successfully.", { course: dto }));
});
