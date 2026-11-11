import mongoose from "mongoose";

export function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

export function notFound(message) {
  return Object.assign(new Error(message), { status: 404 });
}

export function conflict(message) {
  return Object.assign(new Error(message), { status: 409 });
}

export function requireObjectId(value, label = "ID") {
  if (typeof value !== "string" || !mongoose.isValidObjectId(value)) {
    throw badRequest(`${label} is invalid.`);
  }
  return value;
}

export function publicDocument(document) {
  return document?.toObject ? document.toObject({ virtuals: true }) : document;
}

export function handleMongoError(error) {
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0];
    return conflict(field ? `A record with this ${field} already exists.` : "A duplicate record already exists.");
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const firstError = Object.values(error.errors)[0];
    return badRequest(firstError?.message ?? "The submitted data is invalid.");
  }
  if (error instanceof mongoose.Error.CastError) {
    return badRequest(`${error.path || "Value"} is invalid.`);
  }
  if (error?.name === "MongooseServerSelectionError" || error?.name === "MongoNetworkError") {
    return Object.assign(new Error("The database is temporarily unavailable."), { status: 503 });
  }
  return error;
}
