import { apiError } from "../utils/apiResponse.js";
import { handleMongoError } from "../utils/mongo.js";
export default function errorHandler(error, _request, response, _next) {
  if (response.headersSent) return;
  let handledError = handleMongoError(error);
  if (error?.type === "entity.parse.failed") handledError = Object.assign(new Error("Request body contains invalid JSON."), { status: 400 });
  if (error?.type === "entity.too.large") handledError = Object.assign(new Error("Request body is too large."), { status: 413 });
  const status = Number.isInteger(handledError.status) && handledError.status >= 400 && handledError.status < 600 ? handledError.status : 500;
  const message = status === 500 ? "An unexpected server error occurred." : handledError.message;
  if (status >= 500) console.error(`Request failed: ${error.name || "Error"} (HTTP ${status}).`);
  else console.warn(`Request rejected: HTTP ${status}.`);
  response.status(status).json(apiError(message));
}
