export function hasCompletedAllLessons(lessonIds, completedLessonIds, completionPercentage) {
  if (!Array.isArray(lessonIds) || lessonIds.length === 0) return false;
  if (!Array.isArray(completedLessonIds) || completionPercentage !== 100) return false;

  const completed = new Set(completedLessonIds.map((id) => String(id)));
  return lessonIds.every((id) => completed.has(String(id)));
}
