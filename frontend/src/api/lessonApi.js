import api from "./axios.js";

export async function getModuleLessons(moduleId) {
  const { data } = await api.get("/lessons", { params: { moduleId, _sort: "order" } });
  return data;
}
