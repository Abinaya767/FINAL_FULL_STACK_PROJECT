import { expressRequest } from "./expressApi.js";

export async function getModuleLessons(moduleId) {
  const result = await expressRequest(`/modules/${encodeURIComponent(moduleId)}/lessons`);
  return result.data.lessons;
}
