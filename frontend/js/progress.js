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

function renderLessonMarkdown(container, markdown) {
  container.replaceChildren();
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  let list = null;
  let code = null;
  const flush = () => { if (list) container.append(list); list = null; };
  const inline = (element, value) => {
    const safe = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    element.innerHTML = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\x60([^\x60]+)\x60/g, "<code>$1</code>");
  };
  for (const line of lines) {
    if (line.trim().startsWith(String.fromCharCode(96).repeat(3))) {
      flush();
      if (!code) {
        code = document.createElement("pre");
        const child = document.createElement("code");
        code.append(child);
        container.append(code);
      } else code = null;
      continue;
    }
    if (code) { code.querySelector("code").textContent += line + "\n"; continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    const item = line.match(/^\s*[-*]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (item || numbered) {
      if (!list) list = document.createElement(numbered ? "ol" : "ul");
      const li = document.createElement("li");
      inline(li, (item || numbered)[1]);
      list.append(li);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const element = document.createElement(heading ? "h" + Math.min(5, heading[1].length + 1) : "p");
    inline(element, heading ? heading[2] : line);
    container.append(element);
  }
  flush();
}

export async function initializeLearningProgress() {
  const lessonNav = document.querySelector("#lesson-navigation");
  const courseId = selectedCourseId();
  if (!courseId) return;
  const status = addStatus(document.querySelector("main"), "learning-page-status");
  status.textContent = "Loading your learning progress...";
  try {
    const [modules, records, course] = await Promise.all([getCourseModules(courseId), getProgress(), getCourse(courseId)]);
    const progressMap = new Map(records.map((record) => [record.moduleId, record]));
    const title = document.querySelector("#course-title");
    if (title) title.textContent = course.title;
    const description = document.querySelector("#course-description");
    if (description) description.textContent = course.description || "";
    const bar = document.querySelector("#course-progress-bar");
    const label = document.querySelector("#course-progress-label");
    const pct = modules.length ? Math.round(modules.reduce((sum, module) => sum + ((progressMap.get(module.id) || module.progress)?.completionPercentage || 0), 0) / modules.length) : 0;
    const passed = modules.filter((module) => (progressMap.get(module.id) || module.progress)?.quizPassed).length;
    if (bar) bar.value = pct;
    if (label) label.textContent = pct + "% completed (" + passed + " of " + modules.length + " modules passed).";
    status.textContent = "";

    if (!lessonNav) {
      const next = modules.find((module) => !(progressMap.get(module.id) || module.progress)?.quizPassed);
      const startButton = document.querySelector("#start-module-button");
      const finalButton = document.querySelector("#final-assessment-button");
      const nextLabel = document.querySelector("#course-next-module");
      if (next) {
        const p = progressMap.get(next.id) || next.progress;
        const lessonsDone = p?.completionPercentage === 100;
        if (startButton) {
          startButton.href = (lessonsDone ? "/module-quiz" : "/module-learning") + "?course=" + encodeURIComponent(courseId) + "&module=" + encodeURIComponent(next.id);
          startButton.textContent = lessonsDone ? "Take Module " + next.order + " Quiz" : "Start Module " + next.order;
          startButton.hidden = false;
        }
        if (nextLabel) nextLabel.textContent = "Your next step: Module " + next.order + " — " + next.title;
      } else {
        if (startButton) startButton.hidden = true;
        if (nextLabel) nextLabel.textContent = "All modules and quizzes completed. Your final assessment is ready.";
        if (finalButton) {
          finalButton.href = "/final-assessment?course=" + encodeURIComponent(courseId);
          finalButton.hidden = false;
        }
      }
      return;
    }

    const moduleId = moduleIdFromLocation();
    const module = modules.find((item) => item.id === moduleId);
    if (!module || !module.unlocked) throw new Error("This module is locked. Pass the previous module quiz to unlock it.");
    const progress = progressMap.get(module.id) || module.progress;
    const lessons = (module.lessons || []).slice().sort((a, b) => a.order - b.order);
    if (!lessons.length) throw new Error("No lessons have been added to this module yet.");
    const set = (selector, value) => { const node = document.querySelector(selector); if (node) node.textContent = value; };
    set("#module-title", "Module " + module.order + ": " + module.title);
    set("#module-description", module.description || "Complete each lesson in order.");
    set("#module-course-name", course.title);
    const overview = "/course-learning?course=" + encodeURIComponent(courseId);
    const back = document.querySelector("#module-back-link");
    const backNav = document.querySelector("#back-to-course-link");
    if (back) back.href = overview;
    if (backNav) backNav.href = overview;

    const moduleBar = document.querySelector("#module-progress-bar");
    const moduleLabel = document.querySelector("#module-progress-label");
    const lessonTitle = document.querySelector("#lesson-title");
    const lessonBody = document.querySelector("#lesson-body");
    const position = document.querySelector("#lesson-position");
    const lessonStatus = document.querySelector("#lesson-status");
    const completeButton = document.querySelector("#complete-lesson-button");
    const nextButton = document.querySelector("#next-lesson-button");
    const quizButton = document.querySelector("#module-quiz-button");
    const completed = new Set(progress?.completedLessons || []);
    if (moduleBar) moduleBar.value = progress?.completionPercentage || 0;
    let active = Math.max(0, lessons.findIndex((lesson) => !completed.has(lesson.id)));
    if (lessons.every((lesson) => completed.has(lesson.id))) active = lessons.length - 1;

    const render = () => {
      const lesson = lessons[active];
      const done = completed.has(lesson.id);
      if (position) position.textContent = "Lesson " + (active + 1) + " of " + lessons.length;
      if (lessonTitle) lessonTitle.textContent = lesson.title;
      if (lessonBody) renderLessonMarkdown(lessonBody, lesson.content);
      if (completeButton) {
        completeButton.hidden = done;
        completeButton.disabled = done;
        completeButton.textContent = done ? "Lesson Completed" : "Mark Lesson as Completed";
      }
      if (nextButton) {
        nextButton.hidden = !done || active === lessons.length - 1;
        nextButton.disabled = !done || active === lessons.length - 1;
      }
      const allDone = lessons.every((item) => completed.has(item.id));
      if (quizButton) {
        quizButton.hidden = !allDone;
        quizButton.href = "/module-quiz?course=" + encodeURIComponent(courseId) + "&module=" + encodeURIComponent(module.id);
      }
      if (lessonStatus) {
        lessonStatus.textContent = done ? "You have completed this lesson." : "Read the lesson and mark it as completed to continue.";
        lessonStatus.dataset.state = done ? "success" : "notice";
      }
      if (moduleLabel) moduleLabel.textContent = completed.size / lessons.length * 100 + "% completed (" + completed.size + " of " + lessons.length + " lessons).";
      moduleNavRender();
    };
    const moduleNavRender = () => {
      lessonNav.replaceChildren();
      lessons.forEach((item, index) => {
        const li = document.createElement("li");
        const button = document.createElement("button");
        const done = completed.has(item.id);
        const priorDone = lessons.slice(0, index).every((prior) => completed.has(prior.id));
        button.type = "button";
        button.className = "lesson-nav-item" + (index === active ? " is-active" : "") + (done ? " is-completed" : "");
        button.textContent = (index + 1) + ". " + item.title + (done ? " ✓" : "");
        button.disabled = !priorDone;
        button.setAttribute("aria-current", index === active ? "step" : "false");
        button.addEventListener("click", () => { active = index; render(); });
        li.append(button);
        lessonNav.append(li);
      });
    };
    render();
    completeButton.addEventListener("click", async () => {
      const lesson = lessons[active];
      if (!lesson || completed.has(lesson.id)) return;
      completeButton.disabled = true;
      if (lessonStatus) lessonStatus.textContent = "Saving lesson completion...";
      try {
        const updated = await completeLesson(progress.id, lesson.id);
        updated.completedLessons.forEach((id) => completed.add(id));
        render();
        if (lessonStatus) {
          lessonStatus.textContent = "Lesson completion saved.";
          lessonStatus.dataset.state = "success";
        }
      } catch (error) {
        if (lessonStatus) {
          lessonStatus.textContent = error.message;
          lessonStatus.dataset.state = "error";
        }
        completeButton.disabled = false;
      }
    });
    nextButton.addEventListener("click", () => {
      if (active < lessons.length - 1 && completed.has(lessons[active].id)) {
        active += 1;
        render();
      }
    });
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
    const courseBackLink = [...document.querySelectorAll("a")].find((link) =>
      link.textContent.trim().toLowerCase() === "back to course learning"
      || link.getAttribute("href")?.includes("course-learning")
    );
    if (courseBackLink) setNavigationCourse(courseBackLink, courseId);
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
      const continueLink = document.createElement("a");
      continueLink.className = "button-link";
      continueLink.textContent = "Continue to Course";
      continueLink.href = "/course-learning?course=" + encodeURIComponent(courseId);
      status.after(continueLink);
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
        if (result.passed) {
          const continueLink = document.createElement("a");
          continueLink.className = "button-link";
          continueLink.textContent = "Continue to Course";
          continueLink.href = "/course-learning?course=" + encodeURIComponent(courseId);
          status.after(continueLink);
        }
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
