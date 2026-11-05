import { apiResponse } from "../utils/apiResponse.js";
import { credentialStore, studentStore } from "../data/inMemoryStore.js";
import { createStudentRecord } from "./studentController.js";

const registrationFields = new Set(["name", "email", "password", "phone"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validationError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function validateObjectBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object.");
  }
}

export function register(request, response) {
  validateObjectBody(request.body);
  const unknownFields = Object.keys(request.body).filter((field) => !registrationFields.has(field));
  if (unknownFields.length) {
    throw validationError(`Unsupported registration field(s): ${unknownFields.join(", ")}.`);
  }

  for (const field of registrationFields) {
    if (typeof request.body[field] !== "string" || !request.body[field].trim()) {
      throw validationError(`${field} is required.`);
    }
  }

  const email = request.body.email.trim().toLowerCase();
  if (email.length > 254 || !emailPattern.test(email)) {
    throw validationError("A valid student email address is required.");
  }
  if (request.body.password.length < 8 || request.body.password.length > 128) {
    throw validationError("Password must be between 8 and 128 characters.");
  }

  const student = createStudentRecord({
    name: request.body.name,
    email,
    phone: request.body.phone,
  });
  credentialStore.set(student.email, request.body.password);

  response.status(201).json(apiResponse("Student registered successfully.", {
    id: student.id,
    name: student.name,
    email: student.email,
  }));
}

export function login(request, response) {
  validateObjectBody(request.body);
  const { email, password } = request.body;

  if (typeof email !== "string" || !email.trim()) {
    throw validationError("Email is required.");
  }
  if (typeof password !== "string" || !password || password.length > 128) {
    throw validationError("Password is required and must be at most 128 characters.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length > 254 || !emailPattern.test(normalizedEmail)) {
    throw validationError("A valid email address is required.");
  }

  const student = studentStore.list().find((entry) => entry.email === normalizedEmail);
  if (!student || !credentialStore.matches(normalizedEmail, password)) {
    response.status(401).json({
      success: false,
      message: "Invalid email or password.",
      data: {},
    });
    return;
  }

  response.status(200).json(apiResponse("Login successful.", {
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
    },
  }));
}
