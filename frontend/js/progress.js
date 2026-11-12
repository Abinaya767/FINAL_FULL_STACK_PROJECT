import { getCourseIdForLearning } from "./course.js";
import { getEnrollments } from "../src/api/enrollmentApi.js";
import { getCourseModules } from "../src/api/moduleApi.js";
import { completeLesson, getProgress } from "../src/api/progressApi.js";
import { getModuleQuiz, submitModuleQuiz } from "../src/api/quizApi.js";
import { getCourseAssessment, submitCourseAssessment } from "../src/api/assessmentApi.js";
import { getCertificates } from "../src/api/certificateApi.js";
import { deleteNotification, getNotifications, markNotificationRead } from "../src/api/notificationApi.js";
import { getCourse } from "../src/api/courseApi.js";
import { getAuthSession } from "../src/api/authSession.js";

function addStatus(container, className = "api-status") {
  let status = container?.querySelector(`.${className}`);
  if (!status && container) {
    status = document.createElement("p");
    status.className = className;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    container.append(status);
  }
  return status;
}

function addError(container, error) {
  const status = addStatus(container);
  if (status) {
    status.textContent = error.message;
    status.dataset.state = "error";
  }
}

function renderQuestion(form, question, index, prefix) {
  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  const prompt = document.createElement("p");
  legend.textContent = `Question ${index + 1}`;
  prompt.textContent = question.question;
  fieldset.dataset.questionId = question.id;
  fieldset.append(legend, prompt);
  question.options.forEach((option, optionIndex) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = `${prefix}${index + 1}`;
    input.value = String(optionIndex);
    input.required = optionIndex === 0;
    label.append(input, document.createTextNode(` ${option}`));
    fieldset.append(label);
  });
  form.insertBefore(fieldset, form.querySelector('button[type="submit"]'));
}

function selectedCourseId() {
  return getCourseIdForLearning();
}

function setNavigationCourse(link, courseId, moduleId) {
  const params = new URLSearchParams({ course: courseId });
  if (moduleId) params.set("module", moduleId);
  link.href = `${link.pathname}?${params}`;
}

export async function initializeLearningProgress() {
  const modulesSection = [...document.querySelectorAll("main section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Course Modules");
  if (!modulesSection) return;

  const courseId = selectedCourseId();
  const status = addStatus(modulesSection);
  modulesSection.querySelectorAll(":scope > article").forEach((article) => article.remove());
  const title = document.querySelector("main > section h2");
  if (title) title.textContent = "Course";
  const courseSummary = document.querySelector("main > section > p");
  if (courseSummary) courseSummary.textContent = "Course information will load from LearnSpace.";
  const progressSection = [...document.querySelectorAll("main section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Course Progress");
  const progressLabel = progressSection?.querySelector("p");
  if (progressLabel) progressLabel.textContent = "Progress will load from LearnSpace.";
  const lessonSection = document.querySelector("#lesson-content")
    || [...document.querySelectorAll("main section")].find((section) => section.querySelector("h2")?.textContent.trim() === "Lesson Content");
  const lessonHeading = lessonSection?.querySelector("h3");
  if (lessonHeading) lessonHeading.textContent = "Lesson content";
  const lessonDescription = lessonSection?.querySelector("p");
  if (lessonDescription) lessonDescription.textContent = "Select a lesson loaded from LearnSpace.";
  status.textContent = "Loading course modules and your saved progress...";
  try {
    const [modules, allProgress, course] = await Promise.all([
      getCourseModules(courseId),
      getProgress(),
      getCourse(courseId),
    ]);
    const progressByModule = new Map(allProgress.map((record) => [record.moduleId, record]));
    modulesSection.querySelectorAll(":scope > article").forEach((article) => article.remove());
    if (title) title.textContent = course.title;
    if (courseSummary) courseSummary.textContent = course.description;
    status.textContent = "";

    const progressBar = progressSection?.querySelector("progress");
    const courseRecords = modules
      .map((module) => progressByModule.get(module.id))
      .filter(Boolean);
    const completed = courseRecords.filter((record) => record.completionPercentage === 100).length;
    const percentage = courseRecords.length
      ? Math.round(courseRecords.reduce((sum, record) => sum + record.completionPercentage, 0) / courseRecords.length)
      : 0;
    if (progressBar) progressBar.value = percentage;
    if (progressLabel) progressLabel.textContent = `${percentage}% completed (${completed} of ${courseRecords.length} modules complete).`;

    let lessonContent = lessonSection?.querySelector(".api-lesson-content");
    if (!lessonContent && lessonSection) {
      lessonContent = document.createElement("p");
      lessonContent.className = "api-lesson-content";
      lessonSection.insertBefore(lessonContent, lessonSection.querySelector("button"));
    }
    let markButton = lessonSection?.querySelector("button");
    if (markButton) markButton.disabled = true;

    let selected;
    const renderModules = () => {
      modulesSection.querySelectorAll(":scope > article").forEach((article) => article.remove());
      modules.forEach((module) => {
        const progress = progressByModule.get(module.id) || module.progress;
        const article = document.createElement("article");
        const heading = document.createElement("h3");
        const description = document.createElement("p");
        const label = document.createElement("p");
        const bar = document.createElement("progress");
        const list = document.createElement("ul");
        const state = document.createElement("p");
        heading.textContent = `Module ${module.order}: ${module.title}`;
        description.textContent = module.description || "";
        label.textContent = `Completion: ${progress?.completionPercentage ?? 0}%`;
        bar.max = 100;
        bar.value = progress?.completionPercentage ?? 0;
        state.textContent = module.unlocked ? "Unlocked" : "Locked — complete the previous module to unlock.";
        for (const lesson of module.lessons) {
          const item = document.createElement("li");
          const link = document.createElement("button");
          link.type = "button";
          link.textContent = lesson.title;
          link.disabled = !module.unlocked;
          link.addEventListener("click", () => {
            selected = { module, lesson, progress };
            if (lessonHeading) lessonHeading.textContent = lesson.title;
            if (lessonContent) lessonContent.textContent = lesson.content;
            if (markButton) markButton.disabled = progress?.completedLessons?.includes(lesson.id) ?? true;
            const lessonStatus = addStatus(lessonSection, "api-lesson-status");
            lessonStatus.textContent = progress?.completedLessons?.includes(lesson.id)
              ? "This lesson is already complete."
              : "Lesson content loaded from LearnSpace.";
            lessonStatus.dataset.state = "success";
          });
          item.append(link);
          if (progress?.completedLessons?.includes(lesson.id)) item.append(document.createTextNode(" — Completed"));
          list.append(item);
        }
        const quizLink = document.createElement("a");
        quizLink.textContent = "Open Module Quiz";
        quizLink.href = `module-quiz.html?course=${encodeURIComponent(courseId)}&module=${encodeURIComponent(module.id)}`;
        quizLink.setAttribute("aria-disabled", String(!module.unlocked));
        if (!module.unlocked) quizLink.addEventListener("click", (event) => event.preventDefault());
        article.append(heading, description, label, bar, list, state, quizLink);
        modulesSection.append(article);
      });
    };
    renderModules();

    markButton?.addEventListener("click", async () => {
      if (!selected?.progress || !selected.lesson) return;
      markButton.disabled = true;
      const lessonStatus = addStatus(lessonSection, "api-lesson-status");
      lessonStatus.textContent = "Saving lesson completion...";
      try {
        const updated = await completeLesson(selected.progress.id, selected.lesson.id);
        progressByModule.set(updated.moduleId, updated);
        const [refreshedModules, refreshedProgress] = await Promise.all([
          getCourseModules(courseId),
          getProgress(),
        ]);
        modules.splice(0, modules.length, ...refreshedModules);
        refreshedProgress.forEach((record) => progressByModule.set(record.moduleId, record));
        renderModules();
        lessonStatus.textContent = "Lesson completion saved.";
        lessonStatus.dataset.state = "success";
      } catch (error) {
        lessonStatus.textContent = error.message;
        lessonStatus.dataset.state = "error";
        markButton.disabled = false;
      }
    });

    const finalLink = [...document.querySelectorAll("a[href*='final-assessment.html']")]
      .find((link) => link.textContent.toLowerCase().includes("final assessment"));
    if (finalLink) setNavigationCourse(finalLink, courseId);
  } catch (error) {
    status.textContent = error.message;
    status.dataset.state = "error";
  }
}

function moduleIdFromLocation() {
  return new URLSearchParams(window.location.search).get("module");
}

export async function initializeModuleQuiz() {
  const form = document.querySelector("main > form");
  if (!form) return;
  const courseId = selectedCourseId();
  const moduleId = moduleIdFromLocation();
  const header = document.querySelector("main > section");
  const status = addStatus(form, "api-quiz-status");
  const submitButton = form.querySelector('button[type="submit"]');
  form.querySelectorAll(":scope > section, fieldset").forEach((element) => element.remove());
  const headerParagraphs = header?.querySelectorAll("p") ?? [];
  headerParagraphs.forEach((paragraph, index) => {
    if (index > 0) paragraph.remove();
  });
  if (headerParagraphs[0]) headerParagraphs[0].textContent = "Quiz details will load from LearnSpace.";
  if (!moduleId) {
    addError(header, new Error("Open a quiz from an unlocked course module."));
    submitButton.disabled = true;
    return;
  }

  status.textContent = "Loading module quiz...";
  submitButton.disabled = true;
  try {
    const [quiz, progressRecords, course] = await Promise.all([
      getModuleQuiz(moduleId),
      getProgress(),
      getCourse(courseId),
    ]);
    if (!quiz) throw new Error("This module does not have a quiz yet.");
    const module = (await getCourseModules(courseId)).find((item) => item.id === moduleId);
    if (!module) throw new Error("This module is not part of the selected course.");
    const headerParagraph = header?.querySelector("p");
    if (headerParagraph) headerParagraph.textContent = `${course.title} · ${module.title} · ${quiz.title || "Module Quiz"} · ${quiz.questions.length} questions · maximum 2 attempts per 24-hour window.`;
    const progress = progressRecords.find((record) => record.moduleId === moduleId);
    form.querySelectorAll("fieldset").forEach((fieldset) => fieldset.remove());
    quiz.questions.forEach((question, index) => renderQuestion(form, question, index, "q"));
    const attempts = progress?.quizAttempts?.length ?? 0;
    if ((progress?.completionPercentage ?? 0) < 100) {
      status.textContent = "Complete all lessons in this module before taking its quiz.";
      status.dataset.state = "notice";
      return;
    }
    if (progress?.quizPassed) {
      status.textContent = "You have passed this module quiz.";
      status.dataset.state = "success";
      return;
    }
    if (progress?.lockedUntil && new Date(progress.lockedUntil) > new Date()) {
      status.textContent = `Quiz locked until ${new Date(progress.lockedUntil).toLocaleString()}.`;
      status.dataset.state = "error";
      return;
    }
    status.textContent = `${attempts} of 2 attempts used in the current window. Pass mark: ${quiz.passingPercentage ?? 50}%.`;
    submitButton.disabled = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const answers = quiz.questions.map((question, index) => ({
        questionId: question.id,
        answerIndex: Number(form.querySelector(`input[name="q${index + 1}"]:checked`)?.value),
      }));
      if (answers.some((answer) => !Number.isInteger(answer.answerIndex))) {
        status.textContent = "Answer every question before submitting.";
        status.dataset.state = "error";
        return;
      }
      submitButton.disabled = true;
      status.textContent = "Submitting answers...";
      try {
        const result = await submitModuleQuiz(moduleId, answers);
        const history = (await getProgress()).find((record) => record.moduleId === moduleId);
        status.textContent = `Score: ${result.scorePercentage}%. ${result.passed ? "Passed." : "Not passed."} ${result.attemptsRemaining} attempt(s) remain.${result.lockedUntil ? ` Locked until ${new Date(result.lockedUntil).toLocaleString()}.` : ""} History: ${history?.quizAttemptHistory?.length ?? attempts + 1} attempt(s) recorded.`;
        status.dataset.state = result.passed ? "success" : "notice";
        submitButton.disabled = result.passed || result.attemptsRemaining === 0;
      } catch (error) {
        status.textContent = error.message;
        status.dataset.state = "error";
        submitButton.disabled = false;
      }
    });
  } catch (error) {
    status.textContent = error.message;
    status.dataset.state = "error";
  }
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

export async function initializeFinalAssessment() {
  const main = document.querySelector("main");
  if (!document.title.toLowerCase().includes("final assessment")) return;
  const form = document.querySelector("main section form");
  if (!main || !form) return;
  const courseId = selectedCourseId();
  const header = main.querySelector("section");
  const status = addStatus(header, "api-assessment-status");
  const submitButton = form.querySelector('button[type="submit"]');
  form.querySelectorAll(":scope > section, fieldset").forEach((element) => element.remove());
  const attemptLabel = [...header.querySelectorAll("p")]
    .find((paragraph) => paragraph.textContent.includes("Maximum Attempts"));
  attemptLabel?.remove();
  form.hidden = true;
  submitButton.disabled = true;
  status.textContent = "Checking course completion and loading the assessment...";

  try {
    const [assessment, course, enrollments] = await Promise.all([
      getCourseAssessment(courseId),
      getCourse(courseId),
      getEnrollmentsForAssessment(),
    ]);
    const enrollment = enrollments.find((item) => item.courseId === assessment.courseId);
    const attempts = enrollment?.finalAssessmentAttempts ?? [];
    const info = header.querySelectorAll("p");
    if (info[0]) info[0].textContent = `Course: ${course.title}`;
    const eligibility = [...info].find((paragraph) => paragraph.textContent.includes("Eligibility"));
    if (eligibility) eligibility.textContent = "Eligibility: Course modules are complete.";
    form.querySelectorAll("fieldset").forEach((fieldset) => fieldset.remove());
    assessment.questions.forEach((question, index) => {
      renderQuestion(form, question, index, "final-q");
      form.querySelectorAll("fieldset")[index].id = `final-question-${index + 1}`;
    });
    createQuestionNavigation(form, assessment.questions);
    status.textContent = `${assessment.totalQuestions} questions · Pass mark ${assessment.passingPercentage}%. No attempt cap or quiz cooldown applies. ${attempts.length} previous attempt(s) recorded.`;
    status.dataset.state = "success";
    const startButton = document.createElement("button");
    startButton.type = "button";
    startButton.textContent = "Start Final Assessment";
    form.before(startButton);
    startButton.addEventListener("click", async () => {
      startButton.hidden = true;
      form.hidden = false;
      const section = form.closest("section");
      section?.classList.add("assessment-active");
      if (typeof section?.requestFullscreen === "function") {
        try {
          await section.requestFullscreen();
        } catch {
          status.textContent = "Full-screen mode was not granted; you can continue in this page.";
        }
      }
    });
    submitButton.disabled = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const answers = assessment.questions.map((question, index) => ({
        questionId: question.id,
        answerIndex: Number(form.querySelector(`input[name="final-q${index + 1}"]:checked`)?.value),
      }));
      if (answers.some((answer) => !Number.isInteger(answer.answerIndex))) {
        status.textContent = "Answer every question before submitting.";
        status.dataset.state = "error";
        return;
      }
      submitButton.disabled = true;
      status.textContent = "Submitting final assessment...";
      try {
        const result = await submitCourseAssessment(courseId, answers);
        status.textContent = `Score: ${result.scorePercentage}%. ${result.passed ? "Assessment passed." : "Assessment not passed."} ${attempts.length + 1} attempt(s) recorded.${result.certificate ? ` Certificate issued: ${result.certificate.id}.` : ""}`;
        status.dataset.state = result.passed ? "success" : "notice";
        const resultPanel = [...main.querySelectorAll("section")]
          .find((section) => section.querySelector("h2")?.textContent.trim() === "Assessment Result");
        const resultText = resultPanel?.querySelector("p");
        if (resultText) resultText.textContent = status.textContent;
        const history = document.createElement("ul");
        for (const attempt of [...attempts, {
          attemptedAt: new Date().toISOString(),
          scorePercentage: result.scorePercentage,
          passed: result.passed,
        }]) {
          const item = document.createElement("li");
          item.textContent = `${new Date(attempt.attemptedAt).toLocaleString()} — ${attempt.scorePercentage}% — ${attempt.passed ? "Pass" : "Not passed"}`;
          history.append(item);
        }
        if (resultPanel) {
          resultPanel.querySelector(".api-assessment-history")?.remove();
          history.className = "api-assessment-history";
          resultPanel.append(history);
        }
        submitButton.disabled = false;
      } catch (error) {
        status.textContent = error.message;
        status.dataset.state = "error";
        submitButton.disabled = false;
      }
    });
  } catch (error) {
    status.textContent = error.message;
    status.dataset.state = error.status === 403 ? "notice" : "error";
    status.dataset.state === "notice" && (status.textContent = `${error.message} Complete all course modules before starting the final assessment.`);
  }
}

async function getEnrollmentsForAssessment() {
  return getEnrollments();
}

export async function initializeCertificate() {
  const card = document.querySelector("main section article");
  if (!card || !document.querySelector("main h1")?.textContent.includes("Certificate")) return;
  const status = addStatus(card.parentElement);
  card.hidden = true;
  status.textContent = "Loading your certificates...";
  const details = [...document.querySelectorAll("main section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Certificate Details");
  try {
    const [certificates, session] = await Promise.all([getCertificates(), Promise.resolve(getAuthSession())]);
    if (!certificates.length) {
      status.textContent = "No certificate has been issued to your account yet. Complete a course and pass its final assessment to become eligible.";
      status.dataset.state = "empty";
      const button = document.querySelector("main button");
      if (button) button.disabled = true;
      return;
    }
    const courseId = new URLSearchParams(window.location.search).get("course");
    const certificate = courseId
      ? certificates.find((item) => item.courseId === courseId || item.course === courseId)
      : certificates[0];
    if (!certificate) {
      status.textContent = "No issued certificate matches this course.";
      status.dataset.state = "empty";
      return;
    }
    const course = await getCourse(certificate.courseId);
    card.hidden = false;
    const studentName = session?.user?.name || "Student";
    const placeholders = [...card.querySelectorAll("h2")];
    if (placeholders[1]) placeholders[1].textContent = studentName;
    if (placeholders[2]) placeholders[2].textContent = course.title;
    card.querySelectorAll("p").forEach((paragraph) => {
      if (paragraph.textContent.includes("[Completion Date]")) paragraph.textContent = `Completion Date: ${new Date(certificate.issuedAt).toLocaleDateString()}`;
      if (paragraph.textContent.includes("[Unique Certificate ID]")) paragraph.textContent = `Certificate ID: ${certificate.certificateId}`;
    });
    if (details) {
      details.querySelectorAll("p").forEach((paragraph) => {
        if (paragraph.textContent.includes("[Student Full Name]")) paragraph.textContent = `Student Name: ${studentName}`;
        if (paragraph.textContent.includes("[Course Name]")) paragraph.textContent = `Course Name: ${course.title}`;
        if (paragraph.textContent.includes("[Pass Status]")) paragraph.textContent = "Assessment Status: Passed";
        if (paragraph.textContent.includes("[Completion Date]")) paragraph.textContent = `Completion Date: ${new Date(certificate.issuedAt).toLocaleDateString()}`;
        if (paragraph.textContent.includes("[Unique Certificate ID]")) paragraph.textContent = `Certificate ID: ${certificate.certificateId}`;
      });
    }
    const button = document.querySelector("main button");
    button?.addEventListener("click", () => window.print());
    status.textContent = `Certificate verified by LearnSpace. ID: ${certificate.certificateId}`;
    status.dataset.state = "success";
  } catch (error) {
    status.textContent = error.message;
    status.dataset.state = "error";
  }
}

export async function initializeNotifications() {
  const section = [...document.querySelectorAll("main section")]
    .find((item) => item.querySelector("h2")?.textContent.trim() === "All Notifications");
  if (!section) return;
  const status = addStatus(section);
  section.querySelectorAll(":scope > article, :scope > hr").forEach((element) => element.remove());
  status.textContent = "Loading notifications...";
  try {
    const notifications = await getNotifications();
    if (!notifications.length) {
      status.textContent = "You have no notifications.";
      status.dataset.state = "empty";
      return;
    }
    status.textContent = "";
    for (const notification of notifications) {
      const article = document.createElement("article");
      const heading = document.createElement("h3");
      const message = document.createElement("p");
      const date = document.createElement("small");
      heading.textContent = notification.title;
      message.textContent = notification.message;
      date.textContent = `${new Date(notification.createdAt).toLocaleString()} · ${notification.isRead ? "Read" : "Unread"}`;
      article.append(heading, message, date);
      if (!notification.isRead) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Mark as Read";
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            await markNotificationRead(notification._id);
            date.textContent = `${new Date(notification.createdAt).toLocaleString()} · Read`;
            button.remove();
          } catch (error) {
            status.textContent = error.message;
            status.dataset.state = "error";
            button.disabled = false;
          }
        });
        article.append(button);
      }
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Delete";
      removeButton.addEventListener("click", async () => {
        removeButton.disabled = true;
        try {
          await deleteNotification(notification._id);
          article.remove();
        } catch (error) {
          status.textContent = error.message;
          status.dataset.state = "error";
          removeButton.disabled = false;
        }
      });
      article.append(removeButton);
      section.append(article);
    }

    const markAll = [...document.querySelectorAll("main button")]
      .find((button) => button.textContent.trim() === "Mark All as Read");
    if (markAll) {
      markAll.addEventListener("click", async () => {
        markAll.disabled = true;
        try {
          await Promise.all(notifications.filter((item) => !item.isRead)
            .map((item) => markNotificationRead(item._id)));
          await initializeNotifications();
        } catch (error) {
          status.textContent = error.message;
          status.dataset.state = "error";
          markAll.disabled = false;
        }
      });
    }
  } catch (error) {
    status.textContent = error.message;
    status.dataset.state = "error";
  }
}
