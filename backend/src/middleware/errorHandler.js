import { apiError } from "../utils/apiResponse.js";
import { handleMongoError } from "../utils/mongo.js";

export default function errorHandler(error, request, response, _next) {
  if (response.headersSent) return;

  let handledError = handleMongoError(error);
  if (error?.type === "entity.parse.failed") {
    handledError = Object.assign(new Error("Request body contains invalid JSON."), { status: 400 });
  }
  if (error?.type === "entity.too.large") {
    handledError = Object.assign(new Error("Request body is too large."), { status: 413 });
  }

  const status = Number.isInteger(handledError.status) && handledError.status >= 400 && handledError.status < 600
    ? handledError.status
    : 500;
  const message = status === 500 ? "An unexpected server error occurred." : handledError.message;

  if (status >= 500) {
    // Keep detailed diagnostics in the hosting logs only; never expose them to clients.
    console.error("Unhandled API error:", {
      method: request.method,
      path: request.originalUrl,
      name: error?.name || "Error",
      message: error?.message || "No error message",
      stack: error?.stack,
    });
  } else {
    console.warn(`Request rejected: HTTP ${status}.`);
  }

  response.status(status).json(apiError(message));
}
