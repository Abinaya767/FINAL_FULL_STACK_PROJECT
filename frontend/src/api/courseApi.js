import api from "./axios.js";

export async function getCourses() {
  const { data } = await api.get("/courses");
  return data;
}

export async function getCourse(id) {
  const { data } = await api.get("/courses", { params: { id } });
  if (!data[0]) {
    throw new Error("Course not found.");
  }
  return data[0];
}

export async function createCourse(course) {
  const { data } = await api.post("/courses", course);
  return data;
}

export async function updateCourse(id, course) {
  const { data } = await api.patch(`/courses/${encodeURIComponent(id)}`, course);
  return data;
}

export async function deleteCourse(id) {
  await api.delete(`/courses/${encodeURIComponent(id)}`);
}
