const STORAGE_KEY = "learnspace.mockApiProgress.v1";

function readProgress() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const progress = JSON.parse(raw);
    if (!progress || typeof progress !== "object" || Array.isArray(progress)) {
      throw new Error("Invalid progress shape");
    }
    return progress;
  } catch (error) {
    throw new Error("Demo progress is unreadable. Clear this tab's session storage and try again.", { cause: error });
  }
}

export function getCourseProgress(courseId) {
  const allProgress = readProgress();
  return allProgress[courseId] ?? {
    completedLessons: [],
    completedModules: [],
    quizAttempts: {},
    passedQuizzes: [],
    assessmentPassed: false,
  };
}

function updateCourseProgress(courseId, updater) {
  const allProgress = readProgress();
  const progress = getCourseProgress(courseId);
  allProgress[courseId] = updater(progress);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
  return allProgress[courseId];
}

export function completeLesson(courseId, lessonId) {
  return updateCourseProgress(courseId, (progress) => ({
    ...progress,
    completedLessons: [...new Set([...progress.completedLessons, lessonId])],
  }));
}

export function recordQuizAttempt(courseId, moduleId, passed) {
  return updateCourseProgress(courseId, (progress) => {
    const attempts = progress.quizAttempts[moduleId] ?? 0;
    if (attempts >= 2) throw new Error("No attempts remain for this module quiz.");
    return {
      ...progress,
      quizAttempts: { ...progress.quizAttempts, [moduleId]: attempts + 1 },
      passedQuizzes: passed && !progress.passedQuizzes.includes(moduleId)
        ? [...progress.passedQuizzes, moduleId]
        : progress.passedQuizzes,
    };
  });
}

export function completeAssessment(courseId) {
  return updateCourseProgress(courseId, (progress) => ({ ...progress, assessmentPassed: true }));
}
