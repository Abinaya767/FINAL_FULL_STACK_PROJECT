import { expressRequest } from "./expressApi.js";

export async function getCourseModules(courseId) {
  const result = await expressRequest(`/courses/${encodeURIComponent(courseId)}/modules`);
  return result.data.modules;
}

export async function getModule(id) {
  const result = await expressRequest(`/modules/${encodeURIComponent(id)}`);
  return result.data.module;
}
