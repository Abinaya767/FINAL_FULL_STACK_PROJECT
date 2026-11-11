import { expressRequest } from "./expressApi.js";

export async function getStudents() {
  const result = await expressRequest("/students");
  return result.data.students;
}

export async function getStudent(id) {
  const result = await expressRequest(`/students/${encodeURIComponent(id)}`);
  return result.data.student;
}

export async function findStudentByEmail(email) {
  const students = await getStudents();
  return students.find((student) => student.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
}

export async function createStudent(student) {
  const result = await expressRequest("/students", { method: "POST", body: student });
  return result.data.student;
}

export async function updateStudent(id, student) {
  const result = await expressRequest(`/students/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: student,
  });
  return result.data.student;
}

export async function deleteStudent(id) {
  await expressRequest(`/students/${encodeURIComponent(id)}`, { method: "DELETE" });
}
