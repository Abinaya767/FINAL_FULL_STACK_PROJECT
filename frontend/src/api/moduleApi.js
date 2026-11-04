import api from "./axios.js";

export async function getCourseModules(courseId) {
  const { data } = await api.get("/modules", { params: { courseId, _sort: "order" } });
  return data;
}

export async function getModule(id) {
  const { data } = await api.get("/modules", { params: { id } });
  if (!data[0]) {
    throw new Error("Module not found.");
  }
  return data[0];
}
