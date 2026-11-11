import { randomUUID, timingSafeEqual } from "node:crypto";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { badRequest, conflict, notFound } from "../utils/mongo.js";
import { createToken } from "../utils/jwt.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const registrationFields = new Set([
  "name",
  "email",
  "password",
  "phone",
  "college",
  "department",
  "yearOfStudy",
]);
const requiredRegistrationFields = ["name", "email", "password", "phone"];

function validateObjectBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Request body must be a JSON object.");
  }
}

function safeEqual(value, expected) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return valueBuffer.length === expectedBuffer.length
    && timingSafeEqual(valueBuffer, expectedBuffer);
}

function safeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export const register = asyncHandler(async (request, response) => {
  validateObjectBody(request.body);
  const unknownFields = Object.keys(request.body).filter((field) => !registrationFields.has(field));
  if (unknownFields.length) {
    throw badRequest(`Unsupported registration field(s): ${unknownFields.join(", ")}.`);
  }

  for (const field of requiredRegistrationFields) {
    if (typeof request.body[field] !== "string" || !request.body[field].trim()) {
      throw badRequest(`${field} is required.`);
    }
  }

  const name = request.body.name.trim();
  const phone = request.body.phone.trim();
  const email = request.body.email.trim().toLowerCase();
  if (email.length > 254 || !emailPattern.test(email)) {
    throw badRequest("A valid student email address is required.");
  }
  if (name.length < 2 || name.length > 100 || phone.length > 32) {
    throw badRequest("Name must be 2–100 characters and phone must be at most 32 characters.");
  }
  const profile = {};
  for (const field of ["college", "department"]) {
    if (request.body[field] !== undefined) {
      if (typeof request.body[field] !== "string" || !request.body[field].trim() || request.body[field].length > 200) {
        throw badRequest(`${field} must be a non-empty string of at most 200 characters.`);
      }
      profile[field] = request.body[field].trim();
    }
  }
  if (request.body.yearOfStudy !== undefined) {
    const yearOfStudy = typeof request.body.yearOfStudy === "string"
      && /^\d+$/.test(request.body.yearOfStudy)
      ? Number(request.body.yearOfStudy)
      : request.body.yearOfStudy;
    if (!Number.isInteger(yearOfStudy) || yearOfStudy < 1 || yearOfStudy > 20) {
      throw badRequest("yearOfStudy must be an integer between 1 and 20.");
    }
    profile.yearOfStudy = yearOfStudy;
  }
  if (request.body.password.length < 8 || request.body.password.length > 128) {
    throw badRequest("Password must be between 8 and 128 characters.");
  }
  if (email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
    throw conflict("A student with this email already exists.");
  }
  if (await User.exists({ email })) {
    throw conflict("A user with this email already exists.");
  }

  let user;
  try {
    user = await User.create({
      name,
      email,
      passwordHash: request.body.password,
      role: "student",
    });
    const student = await Student.create({
      legacyId: randomUUID(),
      user: user._id,
      phone,
      profile,
    });
    response.status(201).json(apiResponse("Student registered successfully.", {
      id: student.legacyId,
      name: user.name,
      email: user.email,
    }));
  } catch (error) {
    if (user) {
      try {
        await User.deleteOne({ _id: user._id });
      } catch (cleanupError) {
        console.error(`Registration rollback failed (${cleanupError.name}).`);
      }
    }
    throw error;
  }
});

export const login = asyncHandler(async (request, response) => {
  validateObjectBody(request.body);
  const { email, password } = request.body;

  if (typeof email !== "string" || !email.trim()) {
    throw badRequest("Email is required.");
  }
  if (typeof password !== "string" || !password || password.length > 128) {
    throw badRequest("Password is required and must be at most 128 characters.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length > 254 || !emailPattern.test(normalizedEmail)) {
    throw badRequest("A valid email address is required.");
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  let user;
  if (adminEmail && normalizedEmail === adminEmail) {
    if (!adminPassword) {
      throw Object.assign(new Error("Administrator login is not configured."), { status: 503 });
    }
    if (!safeEqual(password, adminPassword)) {
      throw Object.assign(new Error("Invalid email or password."), { status: 401 });
    }
    user = await User.findOneAndUpdate(
      { email: adminEmail },
      {
        $set: {
          name: "LearnSpace Administrator",
          passwordHash: adminPassword,
          role: "admin",
        },
      },
      { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).select("+passwordHash");
  } else {
    user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
    if (!user || !safeEqual(password, user.passwordHash)) {
      throw Object.assign(new Error("Invalid email or password."), { status: 401 });
    }
  }

  const safe = safeUser(user);
  response.status(200).json({
    success: true,
    message: "Login successful.",
    token: createToken(safe),
    user: safe,
  });
});

export const getCurrentUser = asyncHandler(async (request, response) => {
  const user = await User.findById(request.user.id);
  if (!user) {
    throw notFound("The authenticated account is no longer available.");
  }
  response.status(200).json(apiResponse("Authenticated user retrieved successfully.", {
    user: safeUser(user),
  }));
});
