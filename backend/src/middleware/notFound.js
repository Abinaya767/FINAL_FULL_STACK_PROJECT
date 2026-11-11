import { apiError } from "../utils/apiResponse.js";
export default function notFound(request, response) {
  response.status(404).json(apiError(`Route not found: ${request.method} ${request.path}`));
}
