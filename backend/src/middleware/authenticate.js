import { verifyToken } from "../utils/jwt.js";
import { apiError } from "../utils/apiResponse.js";

export function authenticate(request, response, next) {
  const authorization = request.get("authorization");
  const match = typeof authorization === "string"
    ? authorization.match(/^Bearer ([^\s]+)$/i)
    : null;

  if (!match) {
    response.status(401).json(apiError("A valid Bearer token is required."));
    return;
  }

  try {
    const payload = verifyToken(match[1]);
    if (
      typeof payload.sub !== "string"
      || !["student", "admin"].includes(payload.role)
    ) {
      response.status(401).json(apiError("The authentication token is invalid."));
      return;
    }
    request.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      response.status(401).json(apiError("The authentication token is invalid or expired."));
      return;
    }
    next(error);
  }
}
