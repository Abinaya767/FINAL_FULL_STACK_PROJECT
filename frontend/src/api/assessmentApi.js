import api from "./axios.js";

export async function getCourseAssessment(courseId) {
  const { data } = await api.get("/assessments", { params: { courseId } });
  return data[0] ?? null;
}
