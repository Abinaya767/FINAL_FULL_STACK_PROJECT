import { expressRequest } from "./expressApi.js";

export async function getProgress() {
  const result = await expressRequest("/progress");
  return result.data.progress;
}

export async function completeLesson(progressId, lessonId) {
  const result = await expressRequest(
    `/progress/${encodeURIComponent(progressId)}/lessons/${encodeURIComponent(lessonId)}`,
    { method: "PATCH", body: {} },
  );
  return result.data.progress;
}
