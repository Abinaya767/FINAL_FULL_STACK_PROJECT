import { randomBytes, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Enrollment from "../models/Enrollment.js";
import AssessmentAttempt from "../models/AssessmentAttempt.js";
import Progress from "../models/Progress.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Certificate from "../models/Certificate.js";
import Notification from "../models/Notification.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import {
  badRequest,
  conflict,
  notFound,
  requireObjectId,
} from "../utils/mongo.js";

const studentFields = new Set([
  "id",
  "name",
  "fullName",
  "email",
  "password",
  "phone",
  "course",
  "enrolledCourses",
  "college",
  "department",
  "yearOfStudy",
]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const routeIdPattern = /^[A-Za-z0-9_-]{1,128}$/;

function assertRouteId(id) {
  if (!routeIdPattern.test(id)) throw badRequest("Student ID is invalid.");
}

function parseStudentBody(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Request body must be a JSON object.");
  }
  const unknown = Object.keys(body).filter((field) => !studentFields.has(field));
  if (unknown.length) throw badRequest(`Unsupported student field(s): ${unknown.join(", ")}.`);

  const fields = {};
  const name = body.name ?? body.fullName;
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      throw badRequest("Student name must be between 2 and 100 characters.");
    }
    fields.name = name.trim();
  } else if (!partial) {
    throw badRequest("Student name is required.");
  }

  if (body.email !== undefined) {
    if (typeof body.email !== "string" || body.email.length > 254 || !emailPattern.test(body.email.trim())) {
      throw badRequest("A valid student email address is required.");
    }
    fields.email = body.email.trim().toLowerCase();
  } else if (!partial) {
    throw badRequest("Student email is required.");
  }

  if (body.password !== undefined) {
    if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) {
      throw badRequest("Password must be between 8 and 128 characters.");
    }
    fields.password = body.password;
  }

  for (const field of ["phone", "college", "department"]) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "string" || body[field].length > 200) {
        throw badRequest(`${field} must be a string of at most 200 characters.`);
      }
      fields[field] = body[field].trim();
    }
  }
  if (body.yearOfStudy !== undefined) {
    if (!Number.isInteger(body.yearOfStudy) || body.yearOfStudy < 1 || body.yearOfStudy > 20) {
      throw badRequest("yearOfStudy must be an integer between 1 and 20.");
    }
    fields.yearOfStudy = body.yearOfStudy;
  }
  if (body.id !== undefined) {
    if (typeof body.id !== "string" || !routeIdPattern.test(body.id)) {
      throw badRequest("Student ID is invalid.");
    }
    fields.legacyId = body.id;
  }
  if (body.course !== undefined && (typeof body.course !== "string" || !body.course.trim())) {
    throw badRequest("course must be a non-empty course identifier.");
  }
  if (body.enrolledCourses !== undefined && !Array.isArray(body.enrolledCourses)) {
    throw badRequest("enrolledCourses must be an array.");
  }
  if (body.course !== undefined || (body.enrolledCourses?.length ?? 0) > 0) {
    throw badRequest("Use the enrollment API to enroll a student in courses.");
  }
  if (partial && !Object.keys(fields).some((field) => !["legacyId", "password"].includes(field))) {
    throw badRequest("Provide at least one student field to update.");
  }
  return fields;
}

async function findStudent(id, { populate = false } = {}) {
  assertRouteId(id);
  const alternatives = [{ legacyId: id }];
  if (mongoose.isValidObjectId(id)) alternatives.push({ _id: id });
  if (mongoose.isValidObjectId(id)) alternatives.push({ user: id });
  let query = Student.findOne({ $or: alternatives });
  if (populate) {
    query = query.populate("user")
      .populate({ path: "enrollments", populate: { path: "course" } });
  }
  return query;
}

function studentDto(student) {
  const user = student.user;
  const enrollments = (student.enrollments ?? []).filter((enrollment) => enrollment.course);
  const courses = enrollments.map(({ course }) => course.title);
  return {
    id: student.legacyId || student._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: student.phone ?? "",
    course: courses[0] ?? "",
    enrolledCourses: courses,
    college: student.profile?.college ?? "",
    department: student.profile?.department ?? "",
    ...(student.profile?.yearOfStudy ? { yearOfStudy: student.profile.yearOfStudy } : {}),
  };
}

export const getStudents = asyncHandler(async (request, response) => {
  const email = typeof request.query.email === "string" ? request.query.email.trim().toLowerCase() : "";
  const matchingUsers = email ? await User.find({ email }).select("_id").lean() : null;
  const filter = matchingUsers ? { user: { $in: matchingUsers.map(({ _id }) => _id) } } : {};
  const students = await Student.find(filter)
    .populate("user")
    .populate({ path: "enrollments", populate: { path: "course" } })
    .sort({ createdAt: -1 });
  const results = students.map(studentDto);
  response.status(200).json(apiResponse("Students retrieved successfully.", { students: results }));
});

export const getStudent = asyncHandler(async (request, response) => {
  const student = await findStudent(request.params.id, { populate: true });
  if (!student) throw notFound("Student not found.");
  response.status(200).json(apiResponse("Student retrieved successfully.", { student: studentDto(student) }));
});

export const createStudent = asyncHandler(async (request, response) => {
  const fields = parseStudentBody(request.body);
  if (await User.exists({ email: fields.email })) throw conflict("A student with this email already exists.");
  if (fields.legacyId && await Student.exists({ legacyId: fields.legacyId })) {
    throw conflict("A student with this ID already exists.");
  }

  let user;
  try {
    user = await User.create({
      name: fields.name,
      email: fields.email,
      passwordHash: fields.password ?? randomBytes(32).toString("hex"),
      role: "student",
    });
    const student = await Student.create({
      legacyId: fields.legacyId || randomUUID(),
      user: user._id,
      phone: fields.phone,
      profile: {
        college: fields.college,
        department: fields.department,
        yearOfStudy: fields.yearOfStudy,
      },
    });
    await student.populate("user");
    response.status(201).json(apiResponse("Student created successfully.", { student: studentDto(student) }));
  } catch (error) {
    if (user) {
      try {
        await User.deleteOne({ _id: user._id });
      } catch (cleanupError) {
        console.error(`Student creation rollback failed (${cleanupError.name}).`);
      }
    }
    throw error;
  }
});

async function updateStudentRecord(request, response, replacement) {
  const student = await findStudent(request.params.id);
  if (!student) throw notFound("Student not found.");
  const fields = parseStudentBody(request.body, { partial: !replacement });
  if (fields.legacyId) throw badRequest("Student ID cannot be changed.");
  if (fields.email && await User.exists({ email: fields.email, _id: { $ne: student.user } })) {
    throw conflict("A student with this email already exists.");
  }

  const userUpdate = {};
  if (fields.name !== undefined) userUpdate.name = fields.name;
  if (fields.email !== undefined) userUpdate.email = fields.email;
  if (fields.password !== undefined) userUpdate.passwordHash = fields.password;
  const profileUpdate = {};
  for (const field of ["college", "department", "yearOfStudy"]) {
    if (fields[field] !== undefined) profileUpdate[`profile.${field}`] = fields[field];
  }
  if (replacement && student.profile) {
    for (const field of ["college", "department", "yearOfStudy"]) {
      if (fields[field] === undefined) profileUpdate[`profile.${field}`] = undefined;
    }
  }
  if (fields.phone !== undefined) student.phone = fields.phone;
  if (Object.keys(profileUpdate).length) {
    for (const [path, value] of Object.entries(profileUpdate)) {
      if (value === undefined) {
        const key = path.split(".")[1];
        student.profile[key] = undefined;
      } else {
        student.set(path, value);
      }
    }
  }
  const user = Object.keys(userUpdate).length
    ? await User.findById(student.user).select("+passwordHash")
    : null;
  if (user) {
    Object.assign(user, userUpdate);
    await user.save(); // User schema hashes changed passwords before saving.
  }
  await student.save();
  const updated = await findStudent(request.params.id, { populate: true });
  response.status(200).json(apiResponse(
    replacement ? "Student updated successfully." : "Student updated successfully.",
    { student: studentDto(updated) },
  ));
}

export const updateStudent = asyncHandler((request, response) => updateStudentRecord(request, response, true));

export const patchStudent = asyncHandler(async (request, response) => {
  if (
    request.user.role === "student"
    && Object.keys(request.body ?? {}).some((field) => ![
      "name",
      "phone",
      "college",
      "department",
      "yearOfStudy",
    ].includes(field))
  ) {
    throw Object.assign(new Error("Students may update only their own profile fields."), { status: 403 });
  }
  await updateStudentRecord(request, response, false);
});

export const deleteStudent = asyncHandler(async (request, response) => {
  const student = await findStudent(request.params.id, { populate: true });
  if (!student) throw notFound("Student not found.");
  const dto = studentDto(student);
  await Promise.all([
    Enrollment.deleteMany({ student: student._id }),
    AssessmentAttempt.deleteMany({ student: student._id }),
    Progress.deleteMany({ student: student._id }),
    QuizAttempt.deleteMany({ student: student._id }),
    Certificate.deleteMany({ student: student._id }),
    Notification.deleteMany({ student: student._id }),
  ]);
  await User.deleteOne({ _id: student.user._id });
  await student.deleteOne();
  response.status(200).json(apiResponse("Student deleted successfully.", { student: dto }));
});

export async function resolveStudentForUser(userId) {
  requireObjectId(userId, "User ID");
  const student = await Student.findOne({ user: userId });
  if (!student) throw notFound("Student profile not found.");
  return student;
}
