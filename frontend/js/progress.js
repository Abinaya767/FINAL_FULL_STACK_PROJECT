import { getCourseIdForLearning } from "./course.js";
import { readDemoState, setSelectedCourse, updateCourseProgress } from "./storage.js";

const REQUIRED_MODULE_COUNT = 10;

function getCourseProgress(courseId) {
  return readDemoState().progress[courseId] || {
    selectedModuleId: "module-1",
    selectedLessonId: "",
    moduleLessons: {},
    completedLessons: [],
    completedModules: [],
    quizAttempts: {},
    finalAssessmentAttempts: 0,
    requiredModuleCount: REQUIRED_MODULE_COUNT,
  };
}

function isModuleComplete(progress, moduleId) {
  const lessonIds = progress.moduleLessons[moduleId] || [];
  return lessonIds.length > 0 && lessonIds.every((lessonId) => progress.completedLessons.includes(lessonId));
}

function isModuleUnlocked(progress, moduleIds, index) {
  return index === 0 || isModuleComplete(progress, moduleIds[index - 1]);
}

function syncCompletedModules(progress) {
  progress.completedModules = Object.entries(progress.moduleLessons)
    .filter(([moduleId]) => isModuleComplete(progress, moduleId))
    .map(([moduleId]) => moduleId);
  return progress;
}

function addStatus(container, className = "demo-state-note") {
  let status = container.querySelector(`.${className}`);
  if (!status) {
    status = document.createElement("p");
    status.className = className;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    container.append(status);
  }
  return status;
}

function getCourseTitle() {
  return document.querySelector("main > section:first-child h2")?.textContent.trim() || "LearnSpace course";
}

function getModules() {
  const modulesSection = [...document.querySelectorAll("main section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Course Modules");

  if (!modulesSection) {
    return [];
  }

  return [...modulesSection.querySelectorAll(":scope > article")].map((article, index) => {
    const moduleId = `module-${index + 1}`;
    const lessons = [...article.querySelectorAll("li")];
    return { id: moduleId, article, lessons };
  });
}

function syncModuleLessonMap(courseId, modules) {
  updateCourseProgress(courseId, (progress) => {
    progress.moduleLessons = Object.fromEntries(
      modules.map(({ id, lessons }) => [
        id,
        lessons.map((_lesson, index) => `${id}-lesson-${index + 1}`),
      ]),
    );
    progress.requiredModuleCount = Math.max(REQUIRED_MODULE_COUNT, modules.length);
    return syncCompletedModules(progress);
  });
  return getCourseProgress(courseId);
}

function getFirstIncompleteLesson(progress, module) {
  const lessonIds = progress.moduleLessons[module.id] || [];
  const lessonIndex = lessonIds.findIndex((lessonId) => !progress.completedLessons.includes(lessonId));
  return lessonIndex === -1 ? lessonIds[0] || "" : lessonIds[lessonIndex];
}

export function initializeLearningProgress() {
  const modules = getModules();
  if (!modules.length) {
    return;
  }

  const courseId = getCourseIdForLearning();
  const existingState = readDemoState();
  const selectedCourse = existingState.enrollments.find((course) => course.id === courseId)
    || (existingState.selectedCourse?.id === courseId ? existingState.selectedCourse : null);

  setSelectedCourse({
    id: courseId,
    title: selectedCourse?.title || getCourseTitle(),
    description: selectedCourse?.description || "",
  });

  let progress = syncModuleLessonMap(courseId, modules);
  const moduleIds = modules.map(({ id }) => id);
  const firstUnlocked = modules.findIndex((_module, index) => isModuleUnlocked(progress, moduleIds, index));
  let selectedModuleIndex = moduleIds.indexOf(progress.selectedModuleId);

  if (selectedModuleIndex < 0 || !isModuleUnlocked(progress, moduleIds, selectedModuleIndex)) {
    selectedModuleIndex = Math.max(firstUnlocked, 0);
  }

  const selectedModule = modules[selectedModuleIndex];
  if (!selectedModule) {
    return;
  }

  let selectedLessonId = progress.selectedLessonId;
  if (!progress.moduleLessons[selectedModule.id]?.includes(selectedLessonId)
      || progress.completedLessons.includes(selectedLessonId)) {
    selectedLessonId = getFirstIncompleteLesson(progress, selectedModule);
  }

  updateCourseProgress(courseId, (current) => {
    current.selectedModuleId = selectedModule.id;
    current.selectedLessonId = selectedLessonId;
    return syncCompletedModules(current);
  });
  progress = getCourseProgress(courseId);

  const progressSection = [...document.querySelectorAll("main section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Course Progress");
  const progressBar = progressSection?.querySelector("progress");
  if (progressBar) {
    progressBar.max = 100;
    progressBar.value = Math.round((progress.completedModules.length / progress.requiredModuleCount) * 100);
    progressBar.setAttribute("aria-label", `${getCourseTitle()} demo progress`);
  }

  if (progressSection) {
    const note = addStatus(progressSection);
    note.textContent = `Demo progress only: ${progress.completedModules.length} of ${progress.requiredModuleCount} required modules complete. This page currently contains ${modules.length} module${modules.length === 1 ? "" : "s"}; at least ${REQUIRED_MODULE_COUNT} are required.`;
    const percentage = progressBar
      ? Math.round((progress.completedModules.length / progress.requiredModuleCount) * 100)
      : 0;
    const percentageText = progressBar?.nextElementSibling;
    if (percentageText?.tagName === "P") {
      percentageText.textContent = `${percentage}% Completed (demo)`;
    }
  }

  const lessonSection = document.querySelector("#module-1");
  const lessonHeading = lessonSection?.querySelector("h3");
  const lessonStatus = lessonSection ? addStatus(lessonSection, "demo-lesson-status") : null;
  const markButton = lessonSection?.querySelector("button");

  const render = () => {
    progress = getCourseProgress(courseId);
    syncCompletedModules(progress);
    const currentIndex = moduleIds.indexOf(progress.selectedModuleId);
    const currentModule = modules[currentIndex];
    const currentLessons = currentModule?.lessons || [];
    const currentLessonIndex = (progress.moduleLessons[currentModule?.id] || [])
      .indexOf(progress.selectedLessonId);

    modules.forEach(({ id, article, lessons }, index) => {
      const unlocked = isModuleUnlocked(progress, moduleIds, index);
      const complete = isModuleComplete(progress, id);
      article.dataset.demoState = complete ? "complete" : unlocked ? "available" : "locked";
      article.setAttribute("aria-disabled", String(!unlocked));

      lessons.forEach((lesson, lessonIndex) => {
        const lessonId = `${id}-lesson-${lessonIndex + 1}`;
        lesson.tabIndex = unlocked ? 0 : -1;
        lesson.setAttribute("role", "button");
        lesson.setAttribute("aria-disabled", String(!unlocked));
        lesson.setAttribute("aria-pressed", String(progress.selectedLessonId === lessonId));
        lesson.dataset.demoCompleted = String(progress.completedLessons.includes(lessonId));
      });
    });

    const lessonText = currentLessons[currentLessonIndex]?.textContent.trim();
    if (lessonHeading && lessonText) {
      lessonHeading.textContent = lessonText;
    }

    const completed = progress.completedLessons.includes(progress.selectedLessonId);
    if (markButton) {
      markButton.disabled = !progress.selectedLessonId || completed;
      markButton.textContent = completed ? "Lesson Completed (Demo)" : "Mark Lesson as Completed";
    }

    if (lessonStatus) {
      lessonStatus.textContent = currentModule
        ? `Selected: ${currentModule.id.replace("-", " ")}. Completion is stored in this tab only.`
        : "No lesson is selected.";
    }

    if (progressBar) {
      progressBar.value = Math.round((progress.completedModules.length / progress.requiredModuleCount) * 100);
    }
  };

  modules.forEach(({ id, lessons }, moduleIndex) => {
    lessons.forEach((lesson, lessonIndex) => {
      const selectLesson = () => {
        const current = getCourseProgress(courseId);
        if (!isModuleUnlocked(current, moduleIds, moduleIndex)) {
          if (lessonStatus) {
            lessonStatus.textContent = "This module is locked in demo mode until the previous module's lessons are complete.";
          }
          return;
        }

        updateCourseProgress(courseId, (next) => {
          next.selectedModuleId = id;
          next.selectedLessonId = `${id}-lesson-${lessonIndex + 1}`;
          return next;
        });
        render();
      };

      lesson.addEventListener("click", selectLesson);
      lesson.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectLesson();
        }
      });
    });
  });

  document.querySelectorAll('a[href^="#module-"]').forEach((link) => {
    link.addEventListener("click", () => {
      const moduleId = link.getAttribute("href").slice(1);
      const index = moduleIds.indexOf(moduleId);
      if (index < 0) {
        return;
      }

      const current = getCourseProgress(courseId);
      if (!isModuleUnlocked(current, moduleIds, index)) {
        if (lessonStatus) {
          lessonStatus.textContent = "This module is locked in demo mode until the previous module's lessons are complete.";
        }
        return;
      }

      updateCourseProgress(courseId, (next) => {
        next.selectedModuleId = moduleId;
        next.selectedLessonId = getFirstIncompleteLesson(next, modules[index]);
        return next;
      });
      render();
    });
  });

  markButton?.addEventListener("click", () => {
    const current = getCourseProgress(courseId);
    if (!current.selectedLessonId || current.completedLessons.includes(current.selectedLessonId)) {
      return;
    }

    updateCourseProgress(courseId, (next) => {
      next.completedLessons.push(next.selectedLessonId);
      syncCompletedModules(next);

      const activeIndex = moduleIds.indexOf(next.selectedModuleId);
      const activeModule = modules[activeIndex];
      if (isModuleComplete(next, activeModule.id) && modules[activeIndex + 1]) {
        next.selectedModuleId = modules[activeIndex + 1].id;
        next.selectedLessonId = getFirstIncompleteLesson(next, modules[activeIndex + 1]);
      } else {
        next.selectedLessonId = getFirstIncompleteLesson(next, activeModule);
      }
      return next;
    });
    render();
  });

  render();
}

function allRequiredModulesComplete(progress) {
  return Object.keys(progress.moduleLessons).length >= progress.requiredModuleCount
    && progress.completedModules.length >= progress.requiredModuleCount;
}

export function initializeModuleQuiz() {
  const form = document.querySelector("main > form");
  if (!form) {
    return;
  }

  const courseId = getCourseIdForLearning();
  const progress = getCourseProgress(courseId);
  const moduleId = new URLSearchParams(window.location.search).get("module") || "module-1";
  const moduleNumber = Number(moduleId.match(/\d+/)?.[0] || 1);
  const moduleIds = Object.keys(progress.moduleLessons).sort(
    (left, right) => Number(left.match(/\d+/)?.[0] || 0) - Number(right.match(/\d+/)?.[0] || 0),
  );
  const moduleIndex = moduleIds.indexOf(moduleId);
  const unlocked = moduleNumber === 1
    || (moduleIndex > 0 && isModuleComplete(progress, moduleIds[moduleIndex - 1]));
  const submitButton = form.querySelector('button[type="submit"]');
  const status = addStatus(form, "demo-quiz-status");

  if (!unlocked) {
    status.textContent = "This module quiz is locked in demo mode until the previous module's lessons are complete.";
    if (submitButton) {
      submitButton.disabled = true;
    }
    return;
  }

  const getAttempts = () => getCourseProgress(courseId).quizAttempts[moduleId] || 0;
  const refreshAttemptStatus = () => {
    const attempts = getAttempts();
    status.textContent = `Demo quiz attempts: ${attempts} of 2. Answers are not graded in this frontend demo.`;
    if (submitButton) {
      submitButton.disabled = attempts >= 2;
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const questionNames = ["q1", "q2", "q3", "q4", "q5"];
    const missing = questionNames.find((name) => !form.querySelector(`input[name="${name}"]:checked`));
    if (missing) {
      status.textContent = "Please answer all five questions before recording a demo attempt.";
      status.dataset.state = "error";
      return;
    }

    const attempts = getAttempts();
    if (attempts >= 2) {
      refreshAttemptStatus();
      return;
    }

    updateCourseProgress(courseId, (next) => {
      next.quizAttempts[moduleId] = (next.quizAttempts[moduleId] || 0) + 1;
      return next;
    });
    refreshAttemptStatus();
  });

  refreshAttemptStatus();
}

export function initializeFinalAssessment() {
  const form = document.querySelector('main section form input[name="q5"]')?.closest("form");
  if (!form) {
    return;
  }

  const courseId = getCourseIdForLearning();
  const progress = getCourseProgress(courseId);
  const eligible = allRequiredModulesComplete(progress);
  const submitButton = form.querySelector('button[type="submit"]');
  const status = addStatus(form, "demo-assessment-status");

  if (!eligible) {
    status.textContent = `Final assessment unavailable in demo mode: all ${progress.requiredModuleCount} required modules must be complete. This course page currently provides ${Object.keys(progress.moduleLessons).length} module${Object.keys(progress.moduleLessons).length === 1 ? "" : "s"}.`;
    if (submitButton) {
      submitButton.disabled = true;
    }
    return;
  }

  const refresh = () => {
    const attempts = getCourseProgress(courseId).finalAssessmentAttempts;
    status.textContent = `Demo final assessment attempts: ${attempts} of 2. Answers are not graded in this frontend demo.`;
    if (submitButton) {
      submitButton.disabled = attempts >= 2;
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const questionNames = ["q1", "q2", "q3", "q4", "q5"];
    if (questionNames.some((name) => !form.querySelector(`input[name="${name}"]:checked`))) {
      status.textContent = "Please answer all questions before recording a demo attempt.";
      status.dataset.state = "error";
      return;
    }

    const current = getCourseProgress(courseId);
    if (current.finalAssessmentAttempts >= 2) {
      refresh();
      return;
    }

    updateCourseProgress(courseId, (next) => {
      next.finalAssessmentAttempts += 1;
      return next;
    });
    refresh();
  });

  refresh();
}
