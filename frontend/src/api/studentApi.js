import api from "./axios.js";

export async function getStudents() {
  const { data } = await api.get("/students");
  return data;
}

export async function getStudent(id) {
  const { data } = await api.get(`/students/${encodeURIComponent(id)}`);
  return data;
}

export async function findStudentByEmail(email) {
  const { data } = await api.get("/students", { params: { email } });
  return data[0] ?? null;
}

export async function createStudent(student) {
  const { data } = await api.post("/students", student);
  return data;
}
