import { apiError } from "../utils/apiResponse.js";

export function authorizeRoles(...roles) {
  return function authorizeRole(request, response, next) {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json(apiError("You do not have permission to perform this action."));
      return;
    }
    next();
  };
}

export function authorizeSelfOrAdmin(request, response, next) {
  if (
    request.user?.role === "admin"
    || (request.user?.role === "student" && request.user.id === request.params.id)
  ) {
    next();
    return;
  }
  response.status(403).json(apiError("You may access only your own student profile."));
}
