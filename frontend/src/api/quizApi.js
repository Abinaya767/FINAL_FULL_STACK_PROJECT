import api from "./axios.js";

export async function getModuleQuiz(moduleId) {
  const { data } = await api.get("/quizzes", { params: { moduleId } });
  return data[0] ?? null;
}
