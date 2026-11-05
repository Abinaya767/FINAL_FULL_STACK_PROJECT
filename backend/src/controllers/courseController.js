import { apiResponse } from "../utils/apiResponse.js";
import { courseStore } from "../data/inMemoryStore.js";

const courseFields = new Set(["id", "title", "description", "category", "duration", "level"]);

function validationError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function validateId(id) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    throw validationError("Course ID is invalid.");
  }
}

function normalizeCourse(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object.");
  }

  const unknownFields = Object.keys(body).filter((field) => !courseFields.has(field));
  if (unknownFields.length) {
    throw validationError(`Unsupported course field(s): ${unknownFields.join(", ")}.`);
  }

  const fields = {};
  if (body.id !== undefined) {
    if (typeof body.id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(body.id)) {
      throw validationError("Course ID must contain 1 to 128 letters, numbers, underscores, or hyphens.");
    }
    fields.id = body.id;
  }

  for (const field of ["title", "description", "category", "duration"]) {
    if (body[field] === undefined) {
      if (!partial) throw validationError(`Course ${field} is required.`);
      continue;
    }
    if (typeof body[field] !== "string" || !body[field].trim() || body[field].length > 2000) {
      throw validationError(`Course ${field} must be a non-empty string of at most 2000 characters.`);
    }
    fields[field] = body[field].trim();
  }

  if (body.level !== undefined) {
    if (typeof body.level !== "string" || !body.level.trim() || body.level.length > 80) {
      throw validationError("Course level must be a non-empty string of at most 80 characters.");
    }
    fields.level = body.level.trim();
  } else if (!partial) {
    throw validationError("Course level is required.");
  }

  if (partial && Object.keys(fields).length === 0) {
    throw validationError("Provide at least one course field to update.");
  }

  return fields;
}

function ensureUniqueTitle(title, excludedId) {
  const normalizedTitle = title?.trim().toLowerCase();
  if (
    normalizedTitle
    && courseStore.list().some(
      (course) => course.id !== excludedId && course.title.trim().toLowerCase() === normalizedTitle,
    )
  ) {
    throw Object.assign(new Error("A course with this title already exists."), { status: 409 });
  }
}

function ensureUniqueId(id) {
  if (id && courseStore.findById(id)) {
    throw Object.assign(new Error("A course with this ID already exists."), { status: 409 });
  }
}

export function getCourses(_request, response) {
  response.status(200).json(apiResponse("Courses retrieved successfully.", {
    courses: courseStore.list(),
  }));
}

export function getCourse(request, response) {
  validateId(request.params.id);
  const course = courseStore.findById(request.params.id);
  if (!course) {
    throw Object.assign(new Error("Course not found."), { status: 404 });
  }

  response.status(200).json(apiResponse("Course retrieved successfully.", { course }));
}

export function createCourse(request, response) {
  const fields = normalizeCourse(request.body);
  ensureUniqueId(fields.id);
  ensureUniqueTitle(fields.title);
  const course = courseStore.create(fields);

  response.status(201).json(apiResponse("Course created successfully.", { course }));
}

export function updateCourse(request, response) {
  validateId(request.params.id);
  if (!courseStore.findById(request.params.id)) {
    throw Object.assign(new Error("Course not found."), { status: 404 });
  }

  const fields = normalizeCourse(request.body);
  if (fields.id !== undefined) {
    throw validationError("Course ID cannot be changed.");
  }
  ensureUniqueTitle(fields.title, request.params.id);
  const course = courseStore.replace(request.params.id, fields);

  response.status(200).json(apiResponse("Course updated successfully.", { course }));
}

export function patchCourse(request, response) {
  validateId(request.params.id);
  if (!courseStore.findById(request.params.id)) {
    throw Object.assign(new Error("Course not found."), { status: 404 });
  }

  const fields = normalizeCourse(request.body, { partial: true });
  if (fields.id !== undefined) {
    throw validationError("Course ID cannot be changed.");
  }
  ensureUniqueTitle(fields.title, request.params.id);
  const course = courseStore.update(request.params.id, fields);

  response.status(200).json(apiResponse("Course updated successfully.", { course }));
}

export function deleteCourse(request, response) {
  validateId(request.params.id);
  const course = courseStore.delete(request.params.id);
  if (!course) {
    throw Object.assign(new Error("Course not found."), { status: 404 });
  }

  response.status(200).json(apiResponse("Course deleted successfully.", { course }));
}
