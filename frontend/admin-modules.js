import { getCourses } from "./src/api/courseApi.js";
import { getCourseModules } from "./src/api/moduleApi.js";
import { expressRequest } from "./src/api/expressApi.js";

const form = document.querySelector("#module-form");
const courseSelect = document.querySelector("#module-course");
const filterSelect = document.querySelector("#filter-course");
const tableBody = document.querySelector("main table tbody");
const status = document.createElement("p");
status.className = "api-status";
status.setAttribute("role", "status");
status.setAttribute("aria-live", "polite");
form.prepend(status);

let courses = [];

function showStatus(message, state = "") {
  status.textContent = message;
  status.dataset.state = state;
}

function setCourseOptions(select, placeholder) {
  select.replaceChildren(new Option(placeholder, ""));
  for (const course of courses) select.add(new Option(course.title, course.id));
}

function renderModules() {
  tableBody.replaceChildren();
  const selectedId = filterSelect.value;
  const rows = courses.flatMap((course) => (course.modules || [])
    .filter(() => !selectedId || course.id === selectedId)
    .map((module) => ({ course, module })));
  if (!rows.length) {
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.textContent = "No saved modules found for this course.";
    return;
  }
  for (const { course, module } of rows) {
    const row = tableBody.insertRow();
    for (const value of [
      course.title,
      module.order,
      module.title,
      module.quiz ? "Quiz added" : "Quiz not added",
    ]) row.insertCell().textContent = String(value);
    const actions = row.insertCell();
    const quizLink = document.createElement("a");
    quizLink.href = "manage-quizzes.html";
    quizLink.textContent = module.quiz ? "Manage Quiz" : "Add Quiz";
    actions.append(quizLink);
  }
}

async function loadData() {
  courseSelect.disabled = true;
  showStatus("Loading courses and modules...", "loading");
  try {
    const savedCourses = await getCourses();
    courses = await Promise.all(savedCourses.map(async (course) => {
      try {
        return { ...course, modules: await getCourseModules(course.id) };
      } catch (error) {
        return { ...course, modules: [], moduleLoadError: error.message };
      }
    }));
    setCourseOptions(courseSelect, courses.length ? "Choose Course" : "No saved courses found");
    setCourseOptions(filterSelect, "All saved courses");
    courseSelect.disabled = courses.length === 0;
    renderModules();
    showStatus(courses.length ? "Saved courses loaded. Add a module, then use Add Quiz for that module." : "Create a course first in Manage Courses.", courses.length ? "success" : "empty");
    if (courses.some((course) => course.moduleLoadError)) showStatus("Some course modules could not be loaded. Check your admin session and API.", "error");
  } catch (error) {
    setCourseOptions(courseSelect, "Unable to load courses");
    showStatus(error.message, "error");
  }
}

filterSelect.addEventListener("change", renderModules);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const course = courses.find((item) => item.id === courseSelect.value);
  const title = form.querySelector("#module-title").value.trim();
  const description = form.querySelector("#module-description").value.trim();
  const order = Number(form.querySelector("#module-number").value);
  if (!course || !title || !Number.isInteger(order) || order < 1) {
    showStatus("Select a saved course and enter a valid module number and title.", "error");
    return;
  }
  if ((course.modules || []).some((module) => module.order === order)) {
    showStatus("This module number already exists in the selected course.", "error");
    return;
  }
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  showStatus("Saving module to MongoDB...", "loading");
  try {
    await expressRequest(`/courses/${encodeURIComponent(course.id)}/modules`, {
      method: "POST",
      body: { title, description, order },
    });
    course.modules = await getCourseModules(course.id);
    renderModules();
    form.reset();
    courseSelect.value = course.id;
    showStatus(`Module ${order} saved for ${course.title}. Next, click Add Quiz in the module list.`, "success");
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    submit.disabled = false;
  }
});

loadData();
