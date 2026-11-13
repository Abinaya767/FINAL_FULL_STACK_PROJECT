import Assessment from "../models/Assessment.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";

export const getAdminAssessments = asyncHandler(async (_request, response) => {
  const assessments = await Assessment.find()
    .populate("course", "title legacyId")
    .sort({ createdAt: -1 })
    .lean();

  response.status(200).json(apiResponse("Final assessments retrieved successfully.", {
    assessments: assessments
      .filter((assessment) => assessment.course)
      .map((assessment) => ({
        id: assessment._id.toString(),
        course: {
          id: assessment.course.legacyId || assessment.course._id.toString(),
          title: assessment.course.title,
        },
        questions: assessment.questions.map((question) => ({
          id: question._id.toString(),
          question: question.question,
          options: question.options,
          correctAnswerIndex: question.correctAnswerIndex,
        })),
        totalQuestions: assessment.totalQuestions,
        passingPercentage: assessment.passingPercentage,
      })),
  }));
});
