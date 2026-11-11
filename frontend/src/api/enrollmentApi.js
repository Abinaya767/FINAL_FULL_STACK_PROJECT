import { expressRequest } from "./expressApi.js";

export async function getEnrollments() {
  const result = await expressRequest("/enrollments");
  return result.data.enrollments;
}

export async function getStudentEnrollments() {
  return getEnrollments();
}

export async function createEnrollment(enrollment) {
  const result = await expressRequest("/enrollments", { method: "POST", body: enrollment });
  return result.data.enrollment;
}

export async function deleteEnrollment(id) {
  await expressRequest(`/enrollments/${encodeURIComponent(id)}`, { method: "DELETE" });
}
