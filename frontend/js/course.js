import {
  enrollDemoCourse,
  readDemoState,
  setSelectedCourse,
} from "./storage.js";

function getCourseFromForm(form) {
  const article = form.closest("article");
  const action = new URL(form.getAttribute("action") || "", window.location.href);
  const id = action.searchParams.get("course");
  const title = article?.querySelector("h3")?.textContent.trim().replace(/^\d+\.\s*/, "");
  const description = article?.querySelector("p")?.textContent.trim() || "";

  if (!id || !title) {
    throw new Error("This enrollment form is missing its course id or title.");
  }

  return { id, title, description };
}

function getCourseIdFromLocation() {
  return new URLSearchParams(window.location.search).get("course");
}

function selectCourseFromLocation() {
  const courseId = getCourseIdFromLocation();
  if (!courseId) {
    return;
  }

  const state = readDemoState();
  const course = state.enrollments.find((entry) => entry.id === courseId)
    || (state.selectedCourse?.id === courseId ? state.selectedCourse : null);

  if (course) {
    setSelectedCourse(course);
  }
}

export function enrollFromForm(form) {
  const course = getCourseFromForm(form);
  enrollDemoCourse(course);

  const status = form.querySelector(".js-form-status");
  const link = document.createElement("a");
  link.href = "my-courses.html";
  link.textContent = "View My Courses";
  link.className = "demo-state-link";
  form.parentElement.querySelector(".demo-state-link")?.remove();
  status?.insertAdjacentElement("afterend", link);

  return `${course.title} was added to this tab's demo course list. It is not a permanent enrollment.`;
}

export function initializeCoursePage() {
  selectCourseFromLocation();

  document.querySelectorAll('article form[action*="course-learning.html?course="]').forEach((form) => {
    const rememberSelection = () => {
      setSelectedCourse(getCourseFromForm(form));
    };

    form.addEventListener("focusin", rememberSelection);
    form.closest("details")?.querySelector("summary")?.addEventListener("click", rememberSelection);
  });

  const enrollButton = [...document.querySelectorAll("main button")]
    .find((button) => button.textContent.trim() === "Enroll Now");

  if (enrollButton) {
    const course = {
      id: "web-development",
      title: document.querySelector("main section:nth-of-type(2) > h2")?.textContent.trim() || "Web Development",
      description: document.querySelector("main section:nth-of-type(2) > p")?.textContent.trim() || "",
    };
    const status = document.createElement("p");
    status.className = "js-form-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    enrollButton.insertAdjacentElement("afterend", status);
    enrollButton.addEventListener("click", () => {
      setSelectedCourse(course);
      status.textContent = `${course.title} selected. Demo enrollment is available from the course list; no enrollment was saved.`;
    });
  }
}

function slugify(title) {
  return title.toLowerCase()
    .replace(/\bnode\.js\b/g, "nodejs")
    .replace(/\bc\+\+\b/g, "cpp")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function initializeMyCourses() {
  const courseList = [...document.querySelectorAll("main section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Course List");

  if (!courseList) {
    return;
  }

  const state = readDemoState();
  if (!state.enrollments.length) {
    return;
  }

  const heading = document.createElement("h3");
  heading.className = "demo-enrollments-heading";
  heading.textContent = "Demo Enrollments (this tab)";
  courseList.append(heading);

  const note = document.createElement("p");
  note.className = "demo-state-note";
  note.textContent = "These demo enrollments are held in this browser tab only.";
  courseList.append(note);

  state.enrollments.forEach((course) => {
    const progress = state.progress[course.id];
    const requiredCount = Math.max(10, progress?.requiredModuleCount || 10);
    const completedCount = progress?.completedModules?.length || 0;
    const percentage = Math.min(100, Math.round((completedCount / requiredCount) * 100));
    const article = document.createElement("article");
    const title = document.createElement("h4");
    const description = document.createElement("p");
    const label = document.createElement("p");
    const progressBar = document.createElement("progress");
    const link = document.createElement("a");

    article.className = "demo-enrollment-card";
    title.textContent = course.title;
    description.textContent = course.description || "Course description is available in the course catalog.";
    label.textContent = `Demo learning progress: ${percentage}%`;
    progressBar.max = 100;
    progressBar.value = percentage;
    progressBar.setAttribute("aria-label", `${course.title} demo learning progress`);
    link.href = `course-learning.html?course=${encodeURIComponent(course.id)}`;
    link.textContent = "Continue Learning";

    article.append(title, description, label, progressBar, link);
    courseList.append(article);
  });

  courseList.querySelectorAll('a[href="course-learning.html"]').forEach((link) => {
    link.addEventListener("click", () => {
      const title = link.closest("article")?.querySelector("h3")?.textContent.trim();
      if (title) {
        setSelectedCourse({
          id: slugify(title),
          title,
          description: link.closest("article")?.querySelector("p")?.textContent.trim() || "",
        });
      }
    });
  });
}

export function initializeDashboard() {
  const welcome = [...document.querySelectorAll("main > section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Welcome to Your Dashboard!");
  if (!welcome) {
    return;
  }

  const state = readDemoState();
  const message = document.createElement("p");
  message.className = "demo-state-note";
  message.textContent = state.demoSession?.active
    ? "Demo session active in this tab only; your identity has not been authenticated."
    : "Demo mode: progress and enrollments are not permanently saved.";
  welcome.append(message);
}

export function getCourseIdForLearning() {
  const fromUrl = getCourseIdFromLocation();
  if (fromUrl) {
    return fromUrl;
  }
  return readDemoState().selectedCourse?.id || "web-development";
}
