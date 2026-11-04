import { apiError } from "../utils/apiResponse.js";

export default function errorHandler(error, _request, response, _next) {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;
  const message = status === 500
    ? "An unexpected server error occurred."
    : error.message;

  if (status === 500) {
    console.error(error);
  }

  response.status(status).json(apiError(message));
}
