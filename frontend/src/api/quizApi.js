import { expressRequest } from "./expressApi.js";

export async function getModuleQuiz(moduleId) {
  const result = await expressRequest(`/modules/${encodeURIComponent(moduleId)}/quiz`);
  return result.data.quiz ?? null;
}

export async function submitModuleQuiz(moduleId, answers) {
  const result = await expressRequest(`/modules/${encodeURIComponent(moduleId)}/quiz/attempts`, {
    method: "POST",
    body: { answers },
  });
  return result.data;
}
