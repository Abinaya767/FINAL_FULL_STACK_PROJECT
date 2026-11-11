import { apiError } from "../utils/apiResponse.js";
import Student from "../models/Student.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

export function authorizeRoles(...roles) {
  return function authorizeRole(request, response, next) {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json(apiError("You do not have permission to perform this action."));
      return;
    }
    next();
  };
}

export const authorizeSelfOrAdmin = asyncHandler(async (request, response, next) => {
  if (request.user?.role === "admin") {
    next();
    return;
  }
  const id = request.params.id;
  const alternatives = [{ legacyId: id }];
  if (mongoose.isValidObjectId(id)) alternatives.push({ _id: id }, { user: id });
  const student = await Student.findOne({ $or: alternatives }).select("user");
  if (!student || student.user.toString() !== request.user?.id) {
    response.status(403).json(apiError("You may access only your own student profile."));
    return;
  }
  next();
});
