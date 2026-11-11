import { expressRequest } from "./expressApi.js";

export async function getCourseAssessment(courseId) {
  const result = await expressRequest(`/courses/${encodeURIComponent(courseId)}/assessment`);
  return result.data.assessment ?? null;
}

export async function submitCourseAssessment(courseId, answers) {
  const result = await expressRequest(`/courses/${encodeURIComponent(courseId)}/assessment/attempts`, {
    method: "POST",
    body: { answers },
  });
  return result.data;
}
