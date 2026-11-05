import { apiResponse } from "../utils/apiResponse.js";
import { credentialStore, studentStore } from "../data/inMemoryStore.js";
import { createStudentRecord } from "./studentController.js";
import { createToken } from "../utils/jwt.js";
import { timingSafeEqual } from "node:crypto";

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
  if (email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
    throw Object.assign(new Error("A student with this email already exists."), { status: 409 });
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

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const isAdminLogin = Boolean(adminEmail && normalizedEmail === adminEmail);
  if (isAdminLogin && !adminPassword) {
    response.status(503).json({
      success: false,
      message: "Administrator login is not configured.",
      data: {},
    });
    return;
  }
  const isAdmin = Boolean(
    isAdminLogin
    && adminPassword
    && safeEqual(password, adminPassword),
  );
  const student = isAdminLogin
    ? null
    : studentStore.list().find((entry) => entry.email === normalizedEmail);
  if (isAdminLogin ? !isAdmin : (!student || !credentialStore.matches(normalizedEmail, password))) {
    response.status(401).json({
      success: false,
      message: "Invalid email or password.",
      data: {},
    });
    return;
  }

  const user = isAdmin
    ? {
      id: process.env.ADMIN_USER_ID || "learnspace-admin",
      name: "LearnSpace Administrator",
      email: adminEmail,
      role: "admin",
    }
    : {
      id: student.id,
      name: student.name,
      email: student.email,
      role: "student",
    };

  response.status(200).json({
    success: true,
    message: "Login successful.",
    token: createToken(user),
    user,
  });
}

export function getCurrentUser(request, response) {
  const user = request.user.role === "admin"
    ? {
      id: process.env.ADMIN_USER_ID || "learnspace-admin",
      name: "LearnSpace Administrator",
      email: process.env.ADMIN_EMAIL?.trim().toLowerCase(),
      role: "admin",
    }
    : studentStore.findById(request.user.id);

  if (!user) {
    response.status(401).json({
      success: false,
      message: "The authenticated student account is no longer available.",
      data: {},
    });
    return;
  }

  response.status(200).json(apiResponse("Authenticated user retrieved successfully.", {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: request.user.role,
    },
  }));
}

function safeEqual(value, expected) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return valueBuffer.length === expectedBuffer.length
    && timingSafeEqual(valueBuffer, expectedBuffer);
}
