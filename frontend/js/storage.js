const STORAGE_KEY = "learnspace.demoState.v1";

function createEmptyState() {
  return {
    profile: null,
    demoSession: null,
    selectedCourse: null,
    enrollments: [],
    progress: {},
  };
}

function sanitizeCourse(course) {
  if (!course || typeof course.id !== "string" || typeof course.title !== "string") {
    return null;
  }

  return {
    id: course.id,
    title: course.title,
    description: typeof course.description === "string" ? course.description : "",
  };
}

function sanitizeState(state) {
  const clean = createEmptyState();

  if (state.profile && typeof state.profile.displayName === "string") {
    clean.profile = { displayName: state.profile.displayName };
  }

  if (state.demoSession?.active === true && typeof state.demoSession.startedAt === "string") {
    clean.demoSession = {
      active: true,
      startedAt: state.demoSession.startedAt,
    };
  }

  clean.selectedCourse = sanitizeCourse(state.selectedCourse);
  clean.enrollments = Array.isArray(state.enrollments)
    ? state.enrollments.map((entry) => {
      const course = sanitizeCourse(entry);
      return course && typeof entry.enrolledAt === "string"
        ? { ...course, enrolledAt: entry.enrolledAt }
        : null;
    }).filter(Boolean)
    : [];

  if (state.progress && typeof state.progress === "object" && !Array.isArray(state.progress)) {
    Object.entries(state.progress).forEach(([courseId, progress]) => {
      if (!progress || typeof progress !== "object") {
        return;
      }

      const moduleLessons = {};
      if (progress.moduleLessons && typeof progress.moduleLessons === "object") {
        Object.entries(progress.moduleLessons).forEach(([moduleId, lessons]) => {
          if (Array.isArray(lessons)) {
            moduleLessons[moduleId] = lessons.filter((lessonId) => typeof lessonId === "string");
          }
        });
      }

      const quizAttempts = {};
      if (progress.quizAttempts && typeof progress.quizAttempts === "object") {
        Object.entries(progress.quizAttempts).forEach(([moduleId, attempts]) => {
          if (Number.isInteger(attempts) && attempts >= 0) {
            quizAttempts[moduleId] = Math.min(attempts, 2);
          }
        });
      }

      const quizPassed = {};
      if (progress.quizPassed && typeof progress.quizPassed === "object") {
        Object.entries(progress.quizPassed).forEach(([moduleId, passed]) => {
          if (typeof passed === "boolean") {
            quizPassed[moduleId] = passed;
          }
        });
      }

      const finalAssessmentResult = progress.finalAssessmentResult
        && typeof progress.finalAssessmentResult === "object"
        && Number.isFinite(progress.finalAssessmentResult.percentage)
        && typeof progress.finalAssessmentResult.passed === "boolean"
        ? {
          score: Number.isFinite(progress.finalAssessmentResult.score) ? progress.finalAssessmentResult.score : 0,
          total: Number.isFinite(progress.finalAssessmentResult.total) ? progress.finalAssessmentResult.total : 0,
          percentage: Math.min(100, Math.max(0, progress.finalAssessmentResult.percentage)),
          passed: progress.finalAssessmentResult.passed,
          completedAt: typeof progress.finalAssessmentResult.completedAt === "string"
            ? progress.finalAssessmentResult.completedAt
            : "",
        }
        : null;

      clean.progress[courseId] = {
        selectedModuleId: typeof progress.selectedModuleId === "string" ? progress.selectedModuleId : "module-1",
        selectedLessonId: typeof progress.selectedLessonId === "string" ? progress.selectedLessonId : "",
        moduleLessons,
        completedLessons: Array.isArray(progress.completedLessons)
          ? progress.completedLessons.filter((lessonId) => typeof lessonId === "string")
          : [],
        completedModules: Array.isArray(progress.completedModules)
          ? progress.completedModules.filter((moduleId) => typeof moduleId === "string")
          : [],
        quizAttempts,
        quizPassed,
        finalAssessmentAttempts: Number.isInteger(progress.finalAssessmentAttempts)
          ? Math.min(Math.max(progress.finalAssessmentAttempts, 0), 2)
          : 0,
        finalAssessmentResult,
        requiredModuleCount: Number.isInteger(progress.requiredModuleCount)
          ? Math.max(progress.requiredModuleCount, 10)
          : 10,
      };
    });
  }

  return clean;
}

export function readDemoState() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyState();
  }

  let state;
  try {
    state = JSON.parse(raw);
  } catch (error) {
    throw new Error("LearnSpace demo state is unreadable. Clear this tab's session storage and try again.", { cause: error });
  }

  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error("LearnSpace demo state has an invalid shape. Clear this tab's session storage and try again.");
  }

  return sanitizeState(state);
}

export function saveDemoState(state) {
  const safeState = sanitizeState(state);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
  return safeState;
}

export function updateDemoState(updater) {
  if (typeof updater !== "function") {
    throw new TypeError("updateDemoState requires an updater function.");
  }

  const state = readDemoState();
  const updatedState = updater(state) ?? state;
  return saveDemoState(updatedState);
}

export function clearDemoState() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function saveDemoProfile(displayName) {
  return updateDemoState((state) => {
    state.profile = { displayName: displayName.trim() };
    return state;
  });
}

export function startDemoSession() {
  return updateDemoState((state) => {
    state.demoSession = {
      active: true,
      startedAt: new Date().toISOString(),
    };
    return state;
  });
}

export function setSelectedCourse(course) {
  const safeCourse = sanitizeCourse(course);
  if (!safeCourse) {
    throw new TypeError("A course with an id and title is required.");
  }

  return updateDemoState((state) => {
    state.selectedCourse = safeCourse;
    return state;
  });
}

export function enrollDemoCourse(course) {
  const safeCourse = sanitizeCourse(course);
  if (!safeCourse) {
    throw new TypeError("A course with an id and title is required.");
  }

  return updateDemoState((state) => {
    state.selectedCourse = safeCourse;
    const existing = state.enrollments.find((entry) => entry.id === safeCourse.id);
    if (!existing) {
      state.enrollments.push({
        ...safeCourse,
        enrolledAt: new Date().toISOString(),
      });
    }
    return state;
  });
}

export function updateCourseProgress(courseId, updater) {
  if (!courseId || typeof updater !== "function") {
    throw new TypeError("A course id and progress updater are required.");
  }

  return updateDemoState((state) => {
    const progress = state.progress[courseId] || {
      selectedModuleId: "module-1",
      selectedLessonId: "",
      moduleLessons: {},
      completedLessons: [],
      completedModules: [],
      quizAttempts: {},
      quizPassed: {},
      finalAssessmentAttempts: 0,
      finalAssessmentResult: null,
      requiredModuleCount: 10,
    };
    state.progress[courseId] = updater(progress) ?? progress;
    return state;
  });
}
