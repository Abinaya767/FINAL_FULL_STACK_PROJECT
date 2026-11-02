import { getCourseIdForLearning } from "./course.js";
import { webDevelopmentFinalQuestions, webDevelopmentModules } from "./assessment-data.js";
import {
  readDemoState,
  setSelectedCourse,
  updateCourseProgress,
} from "./storage.js";

const COURSE_ID = "web-development";
const PASS_PERCENTAGE = 50;
const MAX_ATTEMPTS = 2;

function emptyProgress() {
  return {
    selectedModuleId: "module-1",
    selectedLessonId: "",
    moduleLessons: {},
    completedLessons: [],
    completedModules: [],
    quizAttempts: {},
    quizPassed: {},
    finalAssessmentAttempts: 0,
    finalAssessmentResult: null,
    requiredModuleCount: webDevelopmentModules.length,
  };
}

function getCourseProgress(courseId = COURSE_ID) {
  return readDemoState().progress[courseId] || emptyProgress();
}

function moduleLessonIds(progress, moduleId) {
  return progress.moduleLessons[moduleId] || [];
}

function moduleLessonPercentage(progress, moduleId) {
  const lessonIds = moduleLessonIds(progress, moduleId);
  if (!lessonIds.length) {
    return 0;
  }
  const completed = lessonIds.filter((lessonId) => progress.completedLessons.includes(lessonId)).length;
  return Math.round((completed / lessonIds.length) * 100);
}

function isModuleComplete(progress, moduleId) {
  return moduleLessonPercentage(progress, moduleId) === 100
    && progress.quizPassed[moduleId] === true;
}

function moduleIsUnlocked(progress, index) {
  return index === 0 || isModuleComplete(progress, `module-${index}`);
}

function syncCompletedModules(progress) {
  progress.completedModules = webDevelopmentModules
    .map((_module, index) => `module-${index + 1}`)
    .filter((moduleId) => isModuleComplete(progress, moduleId));
  return progress;
}

function updateProgress(courseId, updater) {
  updateCourseProgress(courseId, (progress) => {
    updater(progress);
    return progress;
  });
  return getCourseProgress(courseId);
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
  return document.querySelector("main > section:first-child h2")?.textContent.trim()
    || "Web Development";
}

function showUnsupportedCourse(container) {
  const note = addStatus(container, "demo-course-unavailable");
  note.textContent = "This frontend demo currently includes course-specific modules and assessments for Web Development only. Other catalog courses need their own course content.";
}

function initializeModuleCatalog(courseId) {
  const section = [...document.querySelectorAll("main section")]
    .find((item) => item.querySelector("h2")?.textContent.trim() === "Course Modules");
  if (!section) {
    return null;
  }

  section.querySelectorAll(":scope > article").forEach((article) => article.remove());

  const moduleArticles = webDevelopmentModules.map((module, index) => {
    const moduleId = `module-${index + 1}`;
    const article = document.createElement("article");
    const heading = document.createElement("h3");
    const description = document.createElement("p");
    const list = document.createElement("ul");
    const progressLabel = document.createElement("p");
    const progress = document.createElement("progress");
    const lessonLink = document.createElement("a");
    const quizLink = document.createElement("a");
    const stateLabel = document.createElement("p");

    heading.textContent = `Module ${index + 1}: ${module.title}`;
    description.textContent = module.description;
    module.lessons.forEach((lesson, lessonIndex) => {
      const item = document.createElement("li");
      item.textContent = lesson;
      item.dataset.lessonId = `${moduleId}-lesson-${lessonIndex + 1}`;
      list.append(item);
    });

    progressLabel.className = "module-progress-label";
    progress.max = 100;
    progress.className = "module-progress";
    progress.setAttribute("aria-label", `${module.title} completion`);
    lessonLink.href = `#${moduleId}`;
    lessonLink.textContent = "Open Module";
    quizLink.href = `module-quiz.html?course=${encodeURIComponent(courseId)}&module=${moduleId}`;
    quizLink.textContent = `Module ${index + 1} Quiz`;
    quizLink.className = "module-quiz-link";
    stateLabel.className = "module-lock-status";

    article.dataset.moduleId = moduleId;
    article.id = moduleId;
    article.append(heading, description, list, progressLabel, progress, lessonLink, quizLink, stateLabel);
    section.append(article);
    lessonLink.addEventListener("click", () => {
      const current = getCourseProgress(courseId);
      if (!moduleIsUnlocked(current, index)) {
        return;
      }
      updateProgress(courseId, (next) => {
        next.selectedModuleId = moduleId;
        next.selectedLessonId = next.moduleLessons[moduleId]
          .find((lessonId) => !next.completedLessons.includes(lessonId)) || "";
      });
    });
    return { id: moduleId, article, lessons: [...list.querySelectorAll("li")] };
  });

  return moduleArticles;
}

function ensureDemoCourseSelected(courseId) {
  const state = readDemoState();
  const course = state.enrollments.find((entry) => entry.id === courseId)
    || (state.selectedCourse?.id === courseId ? state.selectedCourse : null);
  setSelectedCourse({
    id: courseId,
    title: course?.title || "Web Development",
    description: course?.description || "Learn web development through ten structured modules.",
  });
}

export function initializeLearningProgress() {
  const modulesSection = [...document.querySelectorAll("main section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Course Modules");
  if (!modulesSection) {
    return;
  }

  const courseId = getCourseIdForLearning();
  if (courseId !== COURSE_ID) {
    showUnsupportedCourse(modulesSection);
    return;
  }

  ensureDemoCourseSelected(courseId);
  const modules = initializeModuleCatalog(courseId);
  if (!modules?.length) {
    return;
  }

  updateProgress(courseId, (progress) => {
    progress.moduleLessons = Object.fromEntries(modules.map(({ id, lessons }) => [
      id,
      lessons.map((lesson) => lesson.dataset.lessonId),
    ]));
    progress.requiredModuleCount = modules.length;
    syncCompletedModules(progress);
  });

  const moduleIds = modules.map(({ id }) => id);
  const requestedModule = new URLSearchParams(window.location.search).get("module");
  let progress = getCourseProgress(courseId);
  let currentIndex = moduleIds.indexOf(progress.selectedModuleId);
  const requestedIndex = moduleIds.indexOf(requestedModule);
  if (requestedIndex >= 0 && moduleIsUnlocked(progress, requestedIndex)) {
    currentIndex = requestedIndex;
    progress = updateProgress(courseId, (next) => {
      next.selectedModuleId = moduleIds[requestedIndex];
      next.selectedLessonId = next.moduleLessons[moduleIds[requestedIndex]]
        .find((lessonId) => !next.completedLessons.includes(lessonId)) || "";
    });
  }
  if (currentIndex < 0 || !moduleIsUnlocked(progress, currentIndex)) {
    currentIndex = moduleIds.findIndex((_id, index) => moduleIsUnlocked(progress, index));
  }
  currentIndex = Math.max(0, currentIndex);

  const currentModule = modules[currentIndex];
  const lessonSection = document.querySelector("#lesson-content");
  const lessonHeading = lessonSection?.querySelector("h3");
  const markButton = lessonSection?.querySelector("button");
  const lessonStatus = lessonSection ? addStatus(lessonSection, "demo-lesson-status") : null;
  const progressSection = [...document.querySelectorAll("main section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Course Progress");
  const overallProgress = progressSection?.querySelector("progress");
  const overallLabel = progressSection?.querySelector("p");
  const finalAssessmentLink = [...document.querySelectorAll("a[href='final-assessment.html']")]
    .find((link) => link.textContent.toLowerCase().includes("final assessment"));

  const render = () => {
    progress = syncCompletedModules(getCourseProgress(courseId));
    const selectedModuleIndex = moduleIds.indexOf(progress.selectedModuleId);
    const selectedModule = modules[selectedModuleIndex];
    const selectedLessonId = progress.selectedLessonId;
    const selectedLesson = selectedModule?.lessons.find((lesson) => lesson.dataset.lessonId === selectedLessonId);

    modules.forEach(({ id, article, lessons }, index) => {
      const unlocked = moduleIsUnlocked(progress, index);
      const lessonPercent = moduleLessonPercentage(progress, id);
      const complete = isModuleComplete(progress, id);
      article.dataset.demoState = complete ? "complete" : unlocked ? "available" : "locked";
      article.setAttribute("aria-disabled", String(!unlocked));
      article.querySelector(".module-progress").value = lessonPercent;
      article.querySelector(".module-progress-label").textContent =
        `Lesson completion: ${lessonPercent}%${progress.quizPassed[id] ? " · Quiz passed" : " · Quiz required"}`;
      article.querySelector(".module-lock-status").textContent = complete
        ? "Completed — 100%"
        : unlocked
          ? index === selectedModuleIndex ? "Current unlocked module" : "Unlocked"
          : "Locked — complete the previous module's lessons and pass its quiz.";
      article.querySelector(".module-quiz-link").setAttribute("aria-disabled", String(!unlocked));
      article.querySelector(".module-quiz-link").tabIndex = unlocked ? 0 : -1;

      lessons.forEach((lesson) => {
        const lessonId = lesson.dataset.lessonId;
        const done = progress.completedLessons.includes(lessonId);
        lesson.tabIndex = unlocked ? 0 : -1;
        lesson.setAttribute("role", "button");
        lesson.setAttribute("aria-disabled", String(!unlocked));
        lesson.setAttribute("aria-pressed", String(selectedLessonId === lessonId));
        lesson.dataset.demoCompleted = String(done);
      });
    });

    if (selectedModule && selectedLesson) {
      lessonHeading.textContent = selectedLesson.textContent.trim();
    }

    const lessonIsDone = progress.completedLessons.includes(selectedLessonId);
    if (markButton) {
      markButton.disabled = !selectedLessonId || lessonIsDone;
      markButton.textContent = lessonIsDone ? "Lesson Completed (Demo)" : "Mark Lesson as Completed";
    }

    if (lessonStatus) {
      lessonStatus.textContent = selectedModule
        ? `${selectedModule.id.replace("-", " ")} selected. Demo progress is stored in this tab only.`
        : "No lesson is selected.";
    }

    const overallPercent = Math.round((progress.completedModules.length / modules.length) * 100);
    if (overallProgress) {
      overallProgress.value = overallPercent;
      overallProgress.setAttribute("aria-label", "Overall Web Development course completion");
    }
    if (overallLabel) {
      overallLabel.textContent = `${overallPercent}% overall course completion (${progress.completedModules.length} of ${modules.length} modules complete, demo)`;
    }
    if (finalAssessmentLink) {
      const eligible = progress.completedModules.length === modules.length;
      finalAssessmentLink.setAttribute("aria-disabled", String(!eligible));
      finalAssessmentLink.tabIndex = eligible ? 0 : -1;
      finalAssessmentLink.textContent = eligible
        ? "Start Final Assessment"
        : "Final Assessment (complete all modules first)";
    }
  };

  modules.forEach(({ id, article, lessons }, moduleIndex) => {
    lessons.forEach((lesson) => {
      lesson.addEventListener("click", () => {
        const current = getCourseProgress(courseId);
        if (!moduleIsUnlocked(current, moduleIndex)) {
          lessonStatus.textContent = "This module is locked until the previous module reaches 100% and its quiz is passed.";
          return;
        }
        updateProgress(courseId, (next) => {
          next.selectedModuleId = id;
          next.selectedLessonId = lesson.dataset.lessonId;
        });
        render();
      });
      lesson.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          lesson.click();
        }
      });
    });

    article.querySelector(".module-quiz-link").addEventListener("click", (event) => {
      const current = getCourseProgress(courseId);
      if (!moduleIsUnlocked(current, moduleIndex)) {
        event.preventDefault();
        lessonStatus.textContent = "This quiz is locked until the previous module reaches 100% and its quiz is passed.";
        return;
      }
      updateProgress(courseId, (next) => {
        next.selectedModuleId = id;
        next.selectedLessonId = next.moduleLessons[id].find((lessonId) => !next.completedLessons.includes(lessonId)) || "";
      });
    });
  });

  markButton?.addEventListener("click", () => {
    const current = getCourseProgress(courseId);
    if (!current.selectedLessonId || current.completedLessons.includes(current.selectedLessonId)) {
      return;
    }
    updateProgress(courseId, (next) => {
      next.completedLessons.push(next.selectedLessonId);
      const selectedModuleIndex = moduleIds.indexOf(next.selectedModuleId);
      const selectedModule = modules[selectedModuleIndex];
      next.selectedLessonId = selectedModule.lessons
        .map((lesson) => lesson.dataset.lessonId)
        .find((lessonId) => !next.completedLessons.includes(lessonId)) || "";
      syncCompletedModules(next);
      if (!next.selectedLessonId && modules[selectedModuleIndex + 1] && moduleIsUnlocked(next, selectedModuleIndex + 1)) {
        next.selectedModuleId = modules[selectedModuleIndex + 1].id;
        next.selectedLessonId = next.moduleLessons[next.selectedModuleId]
          .find((lessonId) => !next.completedLessons.includes(lessonId)) || "";
      }
    });
    render();
  });

  render();
}

function renderQuestion(form, item, index, prefix = "q") {
  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  const prompt = document.createElement("p");
  const name = `${prefix}${index + 1}`;
  legend.textContent = `Question ${index + 1}`;
  prompt.textContent = item.prompt;
  fieldset.dataset.questionIndex = String(index);
  fieldset.append(legend, prompt);
  item.options.forEach((option, optionIndex) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = String(optionIndex);
    label.append(input, document.createTextNode(` ${option}`));
    fieldset.append(label);
  });
  form.insertBefore(fieldset, form.querySelector('button[type="submit"]'));
  return fieldset;
}

function getQuizModuleId() {
  const requested = new URLSearchParams(window.location.search).get("module");
  return /^module-(?:[1-9]|10)$/.test(requested || "") ? requested : "module-1";
}

export function initializeModuleQuiz() {
  const form = document.querySelector("main > form");
  if (!form) {
    return;
  }

  const courseId = getCourseIdForLearning();
  const moduleId = getQuizModuleId();
  const moduleIndex = Number(moduleId.match(/\d+/)?.[0]) - 1;
  const module = webDevelopmentModules[moduleIndex];
  const header = document.querySelector("main > section");
  const status = addStatus(form, "demo-quiz-status");
  const submitButton = form.querySelector('button[type="submit"]');

  if (courseId !== COURSE_ID || !module) {
    showUnsupportedCourse(header);
    submitButton.disabled = true;
    return;
  }

  const progress = getCourseProgress(courseId);
  const unlocked = moduleIsUnlocked(progress, moduleIndex);
  const lessonsComplete = moduleLessonPercentage(progress, moduleId) === 100;
  const prompt = header?.querySelector("p");
  if (prompt) {
    prompt.textContent = `Web Development · ${module.title} · 5 questions · 2 attempts maximum · frontend demo only.`;
  }
  if (header) {
    const moduleInfo = [...header.querySelectorAll("p")].find((item) => item.textContent.includes("Module:"));
    if (moduleInfo) {
      moduleInfo.remove();
    }
  }
  form.querySelectorAll("fieldset").forEach((fieldset) => fieldset.remove());
  module.quiz.forEach((item, index) => renderQuestion(form, item, index));

  if (!unlocked) {
    status.textContent = "This module quiz is locked until the previous module reaches 100% and its quiz is passed.";
    submitButton.disabled = true;
    return;
  }
  if (!lessonsComplete) {
    status.textContent = `Complete all lessons in ${module.title} (currently ${moduleLessonPercentage(progress, moduleId)}%) before attempting its quiz.`;
    submitButton.disabled = true;
    return;
  }

  const attemptCount = () => getCourseProgress(courseId).quizAttempts[moduleId] || 0;
  const refresh = () => {
    const latest = getCourseProgress(courseId);
    const attempts = latest.quizAttempts[moduleId] || 0;
    const passed = latest.quizPassed[moduleId] === true;
    status.textContent = `Module quiz: ${attempts} of ${MAX_ATTEMPTS} attempts used. Pass requires ${PASS_PERCENTAGE}%. ${passed ? "Passed." : "Answers are graded in this frontend demo only."}`;
    submitButton.disabled = passed || attempts >= MAX_ATTEMPTS;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const answers = module.quiz.map((_item, index) =>
      form.querySelector(`input[name="q${index + 1}"]:checked`));
    const missingIndex = answers.findIndex((answer) => !answer);
    if (missingIndex >= 0) {
      status.textContent = `Answer Question ${missingIndex + 1} before submitting.`;
      status.dataset.state = "error";
      form.querySelector(`[name="q${missingIndex + 1}"]`)?.focus();
      return;
    }
    if (attemptCount() >= MAX_ATTEMPTS) {
      refresh();
      return;
    }

    const score = answers.reduce((sum, answer, index) =>
      sum + (Number(answer.value) === module.quiz[index].answer ? 1 : 0), 0);
    const percentage = Math.round((score / module.quiz.length) * 100);
    const passed = percentage >= PASS_PERCENTAGE;
    updateProgress(courseId, (next) => {
      next.quizAttempts[moduleId] = (next.quizAttempts[moduleId] || 0) + 1;
      next.quizPassed[moduleId] = passed;
      syncCompletedModules(next);
    });
    status.dataset.state = passed ? "success" : "error";
    status.textContent = `Demo result: ${passed ? "PASS" : "FAIL"} — ${score}/${module.quiz.length} (${percentage}%). ${passed ? "This module is complete." : `At least ${PASS_PERCENTAGE}% is required. You may retry if an attempt remains.`}`;
    refresh();
    status.dataset.state = passed ? "success" : "error";
  });

  refresh();
}

function allRequiredModulesComplete(progress) {
  return webDevelopmentModules.every((_module, index) => isModuleComplete(progress, `module-${index + 1}`));
}

function createQuestionNavigation(form, questions) {
  const nav = document.createElement("nav");
  nav.className = "assessment-question-nav";
  nav.setAttribute("aria-label", "Assessment question navigation");
  questions.forEach((_question, index) => {
    const link = document.createElement("a");
    link.href = `#final-question-${index + 1}`;
    link.textContent = String(index + 1);
    link.setAttribute("aria-label", `Go to question ${index + 1}`);
    nav.append(link);
  });
  form.before(nav);
}

export function gradeAssessment(questions, answers) {
  const score = questions.reduce((sum, item, index) =>
    sum + (Number(answers[index]) === item.answer ? 1 : 0), 0);
  const percentage = questions.length ? (score / questions.length) * 100 : 0;
  return { score, total: questions.length, percentage, passed: percentage >= PASS_PERCENTAGE };
}

export function initializeFinalAssessment() {
  const main = document.querySelector("main");
  const form = document.querySelector('main section form');
  if (!main || !form) {
    return;
  }

  const courseId = getCourseIdForLearning();
  const gate = document.createElement("p");
  gate.className = "demo-assessment-status";
  gate.setAttribute("role", "status");
  gate.setAttribute("aria-live", "polite");
  const eligibilitySection = main.querySelector("section");
  eligibilitySection?.append(gate);
  const startButton = document.createElement("button");
  startButton.type = "button";
  startButton.textContent = "Start Final Assessment";
  startButton.className = "start-final-assessment";
  form.before(startButton);
  form.hidden = true;

  if (courseId !== COURSE_ID) {
    showUnsupportedCourse(eligibilitySection);
    startButton.disabled = true;
    return;
  }

  const progress = getCourseProgress(courseId);
  const eligible = allRequiredModulesComplete(progress);
  const attempts = progress.finalAssessmentAttempts || 0;
  const questions = webDevelopmentFinalQuestions;
  const submitButton = form.querySelector('button[type="submit"]');
  const assessmentSection = form.closest("section");
  const resultPanel = [...main.querySelectorAll("section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Assessment Result");

  form.querySelectorAll("fieldset").forEach((fieldset) => fieldset.remove());
  form.querySelector("button[type='submit']").textContent = "Submit Assessment";
  questions.forEach((item, index) => {
    renderQuestion(form, item, index, "final-q").id = `final-question-${index + 1}`;
  });
  createQuestionNavigation(form, questions);
  const fullscreenMessage = addStatus(assessmentSection, "fullscreen-status");

  if (!eligible) {
    gate.textContent = "Final assessment is locked in demo mode. Complete all 10 modules: every lesson must be complete and each five-question module quiz must be passed.";
    startButton.disabled = true;
    return;
  }

  if (attempts >= MAX_ATTEMPTS || progress.finalAssessmentResult?.passed) {
    gate.textContent = `Assessment attempts used: ${attempts} of ${MAX_ATTEMPTS}. ${progress.finalAssessmentResult?.passed ? "The final assessment has been passed." : "No attempts remain."}`;
    startButton.disabled = true;
    if (resultPanel && progress.finalAssessmentResult) {
      resultPanel.dataset.state = progress.finalAssessmentResult.passed ? "pass" : "fail";
      const result = resultPanel.querySelector("p");
      if (result) {
        result.textContent = `Most recent demo result: ${progress.finalAssessmentResult.passed ? "PASS" : "FAIL"} — ${progress.finalAssessmentResult.score}/${progress.finalAssessmentResult.total} (${progress.finalAssessmentResult.percentage}%).`;
      }
    }
    return;
  }

  gate.textContent = `25 questions · Pass mark ${PASS_PERCENTAGE}% · ${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts === 1 ? "" : "s"} remaining. Results are frontend demo state, not server-verified.`;
  startButton.addEventListener("click", async () => {
    form.hidden = false;
    startButton.hidden = true;
    assessmentSection?.classList.add("assessment-active");
    try {
      if (typeof assessmentSection?.requestFullscreen !== "function") {
        throw new Error("Fullscreen is not supported by this browser.");
      }
      await assessmentSection.requestFullscreen();
      fullscreenMessage.textContent = document.fullscreenElement === assessmentSection
        ? "Full-screen assessment is active."
        : "The browser did not enter full-screen mode. You can continue in this page.";
    } catch (error) {
      fullscreenMessage.textContent = `Full-screen mode was not granted: ${error.message} Continue in this page or use the button below to try again.`;
      console.warn("LearnSpace could not enter full-screen mode.", error);
    }
    const returnButton = document.createElement("button");
    returnButton.type = "button";
    returnButton.className = "return-to-fullscreen";
    returnButton.textContent = "Return to Full-Screen Assessment";
    fullscreenMessage.after(returnButton);
    returnButton.addEventListener("click", async () => {
      try {
        await assessmentSection.requestFullscreen();
        fullscreenMessage.textContent = document.fullscreenElement === assessmentSection
          ? "Full-screen assessment is active."
          : "The browser did not enter full-screen mode.";
      } catch (error) {
        fullscreenMessage.textContent = `Full-screen mode was not granted: ${error.message}`;
      }
    });
  }, { once: true });

  document.addEventListener("fullscreenchange", () => {
    if (!assessmentSection?.classList.contains("assessment-active")) {
      return;
    }
    if (document.fullscreenElement === assessmentSection) {
      fullscreenMessage.textContent = "Full-screen assessment is active.";
    } else {
      fullscreenMessage.textContent = "Full-screen mode was exited. Your answers are still here; return to full-screen mode or submit when ready.";
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const answers = questions.map((_item, index) =>
      form.querySelector(`input[name="final-q${index + 1}"]:checked`)?.value);
    const missing = answers.findIndex((answer) => answer === undefined);
    if (missing >= 0) {
      gate.textContent = `Answer Question ${missing + 1} before submitting the assessment.`;
      gate.dataset.state = "error";
      form.querySelector(`[name="final-q${missing + 1}"]`)?.focus();
      return;
    }

    const latest = getCourseProgress(courseId);
    if (latest.finalAssessmentAttempts >= MAX_ATTEMPTS) {
      gate.textContent = "The maximum of two final-assessment attempts has been reached.";
      submitButton.disabled = true;
      return;
    }

    const result = gradeAssessment(questions, answers);
    updateProgress(courseId, (next) => {
      next.finalAssessmentAttempts += 1;
      next.finalAssessmentResult = {
        ...result,
        percentage: Math.round(result.percentage * 100) / 100,
        completedAt: new Date().toISOString(),
      };
    });
    if (resultPanel) {
      resultPanel.dataset.state = result.passed ? "pass" : "fail";
      const output = resultPanel.querySelector("p");
      if (output) {
        output.textContent = `Demo result: ${result.passed ? "PASS" : "FAIL"} — ${result.score}/${result.total} (${result.percentage.toFixed(2)}%). ${result.passed ? "Certificate demo eligibility unlocked." : `A score of at least ${PASS_PERCENTAGE}% is required. You may retry if an attempt remains.`}`;
      }
    }
    gate.textContent = `Demo result: ${result.passed ? "PASS" : "FAIL"} — ${result.score}/${result.total} (${result.percentage.toFixed(2)}%). Attempt ${latest.finalAssessmentAttempts + 1} of ${MAX_ATTEMPTS}.`;
    gate.dataset.state = result.passed ? "success" : "error";
    submitButton.disabled = result.passed || latest.finalAssessmentAttempts + 1 >= MAX_ATTEMPTS;
    const retryButton = document.createElement("button");
    retryButton.type = "button";
    retryButton.textContent = "Exit Assessment";
    retryButton.addEventListener("click", async () => {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      window.location.reload();
    });
    form.append(retryButton);
  });
}

export function initializeCertificate() {
  const card = document.querySelector(".certificate-page-card");
  if (!card) {
    return;
  }

  const courseId = getCourseIdForLearning();
  const state = readDemoState();
  const progress = state.progress[courseId];
  const eligible = courseId === COURSE_ID
    && !!progress?.finalAssessmentResult?.passed
    && allRequiredModulesComplete(progress)
    && !!state.profile?.displayName;
  const heading = card.querySelector("h1");
  const message = card.querySelector("p");
  const button = card.querySelector("button");

  if (!eligible) {
    heading.textContent = "Certificate Not Available Yet";
    message.textContent = "Complete all Web Development modules and pass the final assessment. Real certificate eligibility requires server verification, which is not connected in this demo.";
    button.disabled = true;
    return;
  }

  heading.textContent = "Congratulations!";
  message.textContent = "Your Web Development demo certificate is ready. This frontend-generated sample is not verified by LearnSpace.";
  button.disabled = false;
  button.addEventListener("click", () => window.print());

  const certificate = document.createElement("div");
  certificate.className = "earned-certificate";
  certificate.innerHTML = `
    <p class="earned-certificate-watermark" aria-hidden="true">DEMO</p>
    <p class="earned-certificate-brand">LearnSpace</p>
    <h2>Certificate of Completion</h2>
    <p>This demo certificate is presented to</p>
    <p class="earned-certificate-name"></p>
    <p>for completing</p>
    <p class="earned-certificate-course">Web Development</p>
    <p class="earned-certificate-note">Demo only · Not verified or issued by a server</p>
  `;
  certificate.querySelector(".earned-certificate-name").textContent = state.profile.displayName;
  card.append(certificate);
}
