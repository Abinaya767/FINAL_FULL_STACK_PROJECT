import api from "./axios.js";

export async function getEnrollments() {
  const { data } = await api.get("/enrollments");
  return data;
}

export async function getStudentEnrollments(studentId) {
  const { data } = await api.get("/enrollments", { params: { studentId } });
  return data;
}

export async function createEnrollment(enrollment) {
  const { data } = await api.post("/enrollments", enrollment);
  return data;
}

export async function deleteEnrollment(id) {
  await api.delete(`/enrollments/${encodeURIComponent(id)}`);
}
