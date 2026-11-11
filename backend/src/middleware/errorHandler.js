import { apiError } from "../utils/apiResponse.js";
import { handleMongoError } from "../utils/mongo.js";

export default function errorHandler(error, _request, response, _next) {
  const handledError = handleMongoError(error);
  const status = Number.isInteger(handledError.status) && handledError.status >= 400 && handledError.status < 600
    ? handledError.status
    : 500;
  const message = status === 500
    ? "An unexpected server error occurred."
    : handledError.message;

  if (status === 500) {
    console.error(`Request failed (${error.name || "Error"}).`);
  }

  response.status(status).json(apiError(message));
}
