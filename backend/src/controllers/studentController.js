import { apiResponse } from "../utils/apiResponse.js";
import { studentStore } from "../data/inMemoryStore.js";

const studentFields = new Set([
  "id",
  "name",
  "fullName",
  "email",
  "phone",
  "course",
  "enrolledCourses",
  "college",
  "department",
  "yearOfStudy",
]);

function validationError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function validateId(id) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    throw validationError("Student ID is invalid.");
  }
}

function normalizeStudent(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object.");
  }

  const unknownFields = Object.keys(body).filter((field) => !studentFields.has(field));
  if (unknownFields.length) {
    throw validationError(`Unsupported student field(s): ${unknownFields.join(", ")}.`);
  }

  const fields = {};
  if (body.id !== undefined) {
    if (typeof body.id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(body.id)) {
      throw validationError("Student ID must contain 1 to 128 letters, numbers, underscores, or hyphens.");
    }
    fields.id = body.id;
  }

  const name = body.name ?? body.fullName;
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim() || name.trim().length > 120) {
      throw validationError("Student name must be a non-empty string of at most 120 characters.");
    }
    fields.name = name.trim();
  } else if (!partial) {
    throw validationError("Student name is required.");
  }

  if (body.email !== undefined) {
    if (
      typeof body.email !== "string"
      || body.email.length > 254
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    ) {
      throw validationError("A valid student email address is required.");
    }
    fields.email = body.email.trim().toLowerCase();
  } else if (!partial) {
    throw validationError("Student email is required.");
  }

  for (const field of ["phone", "course", "college", "department"]) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "string" || body[field].length > 200) {
        throw validationError(`${field} must be a string of at most 200 characters.`);
      }
      fields[field] = body[field].trim();
    }
  }

  if (body.enrolledCourses !== undefined) {
    if (
      !Array.isArray(body.enrolledCourses)
      || body.enrolledCourses.some(
        (course) => typeof course !== "string" || !course.trim() || course.length > 200,
      )
    ) {
      throw validationError("enrolledCourses must be an array of non-empty strings.");
    }
    fields.enrolledCourses = [...new Set(body.enrolledCourses.map((course) => course.trim()))];
  }

  if (body.yearOfStudy !== undefined) {
    if (!Number.isInteger(body.yearOfStudy) || body.yearOfStudy < 1) {
      throw validationError("yearOfStudy must be a positive integer.");
    }
    fields.yearOfStudy = body.yearOfStudy;
  }

  if (partial && Object.keys(fields).length === 0) {
    throw validationError("Provide at least one student field to update.");
  }

  return fields;
}

function ensureUniqueEmail(email, excludedId) {
  if (
    email
    && studentStore.list().some(
      (student) => student.id !== excludedId && student.email.toLowerCase() === email,
    )
  ) {
    throw Object.assign(new Error("A student with this email already exists."), { status: 409 });
  }
}

function ensureUniqueId(id) {
  if (id && studentStore.findById(id)) {
    throw Object.assign(new Error("A student with this ID already exists."), { status: 409 });
  }
}

export function getStudents(_request, response) {
  response.status(200).json(apiResponse("Students retrieved successfully.", {
    students: studentStore.list(),
  }));
}

export function getStudent(request, response) {
  validateId(request.params.id);
  const student = studentStore.findById(request.params.id);
  if (!student) {
    throw Object.assign(new Error("Student not found."), { status: 404 });
  }

  response.status(200).json(apiResponse("Student retrieved successfully.", { student }));
}

export function createStudentRecord(body) {
  const fields = normalizeStudent(body);
  ensureUniqueId(fields.id);
  ensureUniqueEmail(fields.email);
  return studentStore.create(fields);
}

export function createStudent(request, response) {
  const student = createStudentRecord(request.body);
  response.status(201).json(apiResponse("Student created successfully.", { student }));
}

export function updateStudent(request, response) {
  validateId(request.params.id);
  if (!studentStore.findById(request.params.id)) {
    throw Object.assign(new Error("Student not found."), { status: 404 });
  }

  const fields = normalizeStudent(request.body);
  if (fields.id !== undefined) {
    throw validationError("Student ID cannot be changed.");
  }
  ensureUniqueEmail(fields.email, request.params.id);
  const student = studentStore.replace(request.params.id, fields);

  response.status(200).json(apiResponse("Student updated successfully.", { student }));
}

export function patchStudent(request, response) {
  validateId(request.params.id);
  if (!studentStore.findById(request.params.id)) {
    throw Object.assign(new Error("Student not found."), { status: 404 });
  }

  const fields = normalizeStudent(request.body, { partial: true });
  if (fields.id !== undefined) {
    throw validationError("Student ID cannot be changed.");
  }
  ensureUniqueEmail(fields.email, request.params.id);
  const student = studentStore.update(request.params.id, fields);

  response.status(200).json(apiResponse("Student updated successfully.", { student }));
}

export function deleteStudent(request, response) {
  validateId(request.params.id);
  const student = studentStore.delete(request.params.id);
  if (!student) {
    throw Object.assign(new Error("Student not found."), { status: 404 });
  }

  response.status(200).json(apiResponse("Student deleted successfully.", { student }));
}
