import { expressRequest } from "./expressApi.js";

export async function getCourses() {
  const result = await expressRequest("/courses");
  return result.data.courses;
}

export async function getCourse(id) {
  const result = await expressRequest(`/courses/${encodeURIComponent(id)}`);
  return result.data.course;
}

export async function createCourse(course) {
  const result = await expressRequest("/courses", { method: "POST", body: course });
  return result.data.course;
}

export async function updateCourse(id, course) {
  const result = await expressRequest(`/courses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: course,
  });
  return result.data.course;
}

export async function deleteCourse(id) {
  await expressRequest(`/courses/${encodeURIComponent(id)}`, { method: "DELETE" });
}
