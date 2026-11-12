import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Student from "../models/Student.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";

export const getDashboardStatistics = asyncHandler(async (_request, response) => {
  const [totalStudents, totalCourses, totalEnrollments, completedCourses] = await Promise.all([
    Student.countDocuments(),
    Course.countDocuments(),
    Enrollment.countDocuments(),
    Enrollment.countDocuments({ status: "completed" }),
  ]);

  response.status(200).json(apiResponse("Dashboard statistics retrieved successfully.", {
    totalStudents,
    totalCourses,
    totalEnrollments,
    completedCourses,
  }));
});
