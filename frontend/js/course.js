import { getCourse, getCourses } from "../src/api/courseApi.js";
import { createEnrollment, getEnrollments } from "../src/api/enrollmentApi.js";
import { getProgress } from "../src/api/progressApi.js";
import { getAuthSession } from "../src/api/authSession.js";

function addStatus(container, className = "api-status") {
  let status = container?.querySelector(`.${className}`);
  if (!status && container) {
    status = document.createElement("p");
    status.className = className;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    container.append(status);
  }
  return status;
}

export function getCourseIdForLearning() {
  return new URLSearchParams(window.location.search).get("course");
}

function courseLink(path, courseId) {
  return `${path}?course=${encodeURIComponent(courseId)}`;
}

function requireStudentLogin() {
  const session = getAuthSession();
  if (session?.token && session.user?.role === "student") return true;

  const returnTo = window.location.pathname + window.location.search;
  if (window.parent !== window) {
    window.parent.postMessage({ type: "learnspace:auth-required", returnTo }, window.location.origin);
  } else {
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return false;
}

function renderCourseCard(course, enrolled = false) {
  const article = document.createElement("article");
  const heading = document.createElement("h3");
  const description = document.createElement("p");
  const detailsLink = document.createElement("a");

  heading.textContent = course.title;
  description.textContent = course.description || "Course description is not available.";
  detailsLink.href = courseLink("course-details.html", course.id);
  detailsLink.textContent = "Course Details";
  article.append(heading, description, detailsLink);

  if (enrolled) {
    const learningLink = document.createElement("a");
    learningLink.href = courseLink("course-learning.html", course.id);
    learningLink.textContent = "Continue Learning";
    article.append(learningLink);
  } else {
    const enrollButton = document.createElement("button");
    enrollButton.type = "button";
    enrollButton.textContent = "Enroll Now";
    enrollButton.addEventListener("click", async () => {
      const status = addStatus(article);
      enrollButton.disabled = true;
      status.textContent = "Enrolling...";
      try {
        await createEnrollment({ courseId: course.id });
        status.textContent = "Enrollment successful.";
        status.dataset.state = "success";
        const learningLink = document.createElement("a");
        learningLink.href = courseLink("course-learning.html", course.id);
        learningLink.textContent = "Start Learning";
        article.append(learningLink);
      } catch (error) {
        status.textContent = error.message;
        status.dataset.state = "error";
        enrollButton.disabled = false;
      }
    });
    article.append(enrollButton);
  }
  return article;
}

export async function initializeCoursePage() {
  const catalogSection = [...document.querySelectorAll("main section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Available Courses");
  if (catalogSection) {
    const status = addStatus(catalogSection);
    catalogSection.querySelectorAll(":scope > article").forEach((article) => article.remove());
    const searchForm = document.querySelector('form[action="#"]');
    const searchInput = searchForm?.querySelector('input[type="search"]');
    const render = (courses) => {
      catalogSection.querySelectorAll(":scope > article").forEach((article) => article.remove());
      const term = searchInput?.value.trim().toLowerCase() || "";
      const filtered = courses.filter((course) => `${course.title} ${course.description} ${course.category}`
        .toLowerCase().includes(term));
      if (!filtered.length) {
        status.textContent = term ? "No courses match your search." : "No courses are currently available.";
        status.dataset.state = "empty";
        return;
      }
      status.textContent = "";
      filtered.forEach((course) => catalogSection.append(renderCourseCard(course)));
    };

    status.textContent = "Loading courses...";
    try {
      const courses = await getCourses();
      render(courses);
      searchForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        render(courses);
      });
      searchInput?.addEventListener("input", () => render(courses));
    } catch (error) {
      status.textContent = error.message;
      status.dataset.state = "error";
    }
    return;
  }

  const detailsSection = [...document.querySelectorAll("main section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Course Details");
  if (!detailsSection) return;
  const courseId = getCourseIdForLearning();
  const contentSection = detailsSection.nextElementSibling;
  const status = addStatus(contentSection);
  const heading = contentSection.querySelector("h2");
  const description = contentSection.querySelector("p");
  if (heading) heading.textContent = "Course Details";
  if (description) description.textContent = "Course details will load from LearnSpace.";
  contentSection.querySelectorAll("h3, ul, ol").forEach((element) => element.remove());
  contentSection.querySelectorAll("p").forEach((paragraph) => {
    if (paragraph !== description && paragraph !== status && !paragraph.querySelector("a")) paragraph.remove();
  });
  const button = [...(contentSection?.querySelectorAll("button") ?? [])]
    .find((candidate) => candidate.textContent.trim() === "Enroll Now");
  if (!courseId) {
    status.textContent = "Choose a course from the course catalog to view its details.";
    status.dataset.state = "empty";
    return;
  }
  status.textContent = "Loading course details...";
  try {
    const course = await getCourse(courseId);
    if (heading) heading.textContent = course.title;
    if (description) description.textContent = course.description;
    const meta = document.createElement("p");
    meta.textContent = [course.category, course.level, course.duration].filter(Boolean).join(" · ");
    status.before(meta);
    status.textContent = "";
    if (button) {
      button.addEventListener("click", async () => {
        button.disabled = true;
        status.textContent = "Enrolling...";
        try {
          await createEnrollment({ courseId: course.id });
          status.textContent = "Enrollment successful.";
          status.dataset.state = "success";
          window.location.href = courseLink("course-learning.html", course.id);
        } catch (error) {
          status.textContent = error.message;
          status.dataset.state = "error";
          button.disabled = false;
        }
      });
    }
  } catch (error) {
    status.textContent = error.message;
    status.dataset.state = "error";
  }
}

export async function initializeMyCourses() {
  const courseList = [...document.querySelectorAll("main section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Course List");
  if (!courseList) return;

  const status = addStatus(courseList);
  courseList.querySelectorAll(":scope > article").forEach((article) => article.remove());
  status.textContent = "Loading your enrollments...";
  try {
    const [enrollments, progress] = await Promise.all([getEnrollments(), getProgress()]);
    if (!enrollments.length) {
      status.textContent = "You are not enrolled in any courses yet.";
      status.dataset.state = "empty";
      return;
    }
    const progressByCourse = new Map();
    for (const record of progress) {
      const current = progressByCourse.get(record.courseId) ?? [];
      current.push(record);
      progressByCourse.set(record.courseId, current);
    }
    status.textContent = "";
    for (const enrollment of enrollments) {
      const course = {
        id: enrollment.courseId,
        title: enrollment.courseTitle || enrollment.course || "Course",
        description: "",
      };
      const records = progressByCourse.get(enrollment.courseId) ?? [];
      const percent = records.length
        ? Math.round(records.reduce((total, record) => total + record.completionPercentage, 0) / records.length)
        : 0;
      const article = renderCourseCard(course, true);
      const label = document.createElement("p");
      const bar = document.createElement("progress");
      label.textContent = `Course progress: ${percent}%`;
      bar.max = 100;
      bar.value = percent;
      bar.setAttribute("aria-label", `${course.title} progress`);
      article.append(label, bar);
      courseList.append(article);
    }
  } catch (error) {
    status.textContent = error.message;
    status.dataset.state = "error";
  }
}

export async function initializeDashboard() {
  const welcome = [...document.querySelectorAll("main > section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "Welcome to Your Dashboard!");
  if (!welcome) return;
  const session = getAuthSession();
  const status = addStatus(welcome);
  status.textContent = "Loading your learning overview...";
  try {
    const [enrollments, progress] = await Promise.all([getEnrollments(), getProgress()]);
    const name = session?.user?.name || "student";
    status.textContent = `Welcome, ${name}. You have ${enrollments.length} enrolled course${enrollments.length === 1 ? "" : "s"} and ${progress.filter((record) => record.status === "completed").length} completed modules.`;
    status.dataset.state = "success";
  } catch (error) {
    status.textContent = error.message;
    status.dataset.state = "error";
  }
}
