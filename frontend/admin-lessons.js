import { getCourses } from "./src/api/courseApi.js";
import { getCourseModules } from "./src/api/moduleApi.js";
import { expressRequest } from "./src/api/expressApi.js";

const form = document.querySelector("main section form");
const courseSelect = document.querySelector("#lesson-course");
const moduleSelect = document.querySelector("#lesson-module");
const filterCourse = document.querySelector("#filter-course");
const filterModule = document.querySelector("#filter-module");
const tableBody = document.querySelector("main table tbody");
const status = document.createElement("p");
status.className = "api-status";
status.setAttribute("role", "status");
status.setAttribute("aria-live", "polite");
form?.prepend(status);

let courses = [];
let modulesByCourse = new Map();

function showStatus(message, state = "") {
  status.textContent = message;
  status.dataset.state = state;
}

function fillSelect(select, placeholder, items, value, label) {
  select.replaceChildren(new Option(placeholder, ""));
  for (const item of items) select.add(new Option(label(item), value(item)));
}

function allLessons() {
  return courses.flatMap((course) => (modulesByCourse.get(course.id) || []).flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, course, module }))));
}

function renderLessons() {
  const courseId = filterCourse.value;
  const moduleId = filterModule.value;
  const lessons = allLessons().filter((lesson) =>
    (!courseId || lesson.course.id === courseId) && (!moduleId || lesson.module.id === moduleId));
  tableBody.replaceChildren();
  if (!lessons.length) {
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 8;
    cell.textContent = "No lessons match the selected filters.";
    return;
  }
  for (const lesson of lessons) {
    const row = tableBody.insertRow();
    for (const value of [lesson.id, lesson.course.title, lesson.module.title, lesson.order, lesson.title, "—", "Published"]) {
      row.insertCell().textContent = String(value ?? "");
    }
    const actions = row.insertCell();
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", async () => {
      const title = window.prompt("Lesson title", lesson.title);
      if (title === null) return;
      const content = window.prompt("Lesson content", lesson.content);
      if (content === null) return;
      const orderValue = window.prompt("Lesson number", String(lesson.order));
      if (orderValue === null) return;
      const order = Number(orderValue);
      if (!title.trim() || !content.trim() || !Number.isInteger(order) || order < 1) {
        showStatus("Enter a title, content and a valid lesson number.", "error");
        return;
      }
      edit.disabled = true;
      try {
        await expressRequest("/lessons/" + encodeURIComponent(lesson.id), {
          method: "PUT",
          body: { title: title.trim(), content, order },
        });
        await loadData();
        showStatus("Lesson updated successfully.", "success");
      } catch (error) {
        showStatus(error.message, "error");
        edit.disabled = false;
      }
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!window.confirm("Delete the lesson '" + lesson.title + "'? Student progress for this lesson will be recalculated.")) return;
      remove.disabled = true;
      try {
        await expressRequest("/lessons/" + encodeURIComponent(lesson.id), { method: "DELETE" });
        await loadData();
        showStatus("Lesson deleted and affected progress recalculated.", "success");
      } catch (error) {
        showStatus(error.message, "error");
        remove.disabled = false;
      }
    });
    actions.append(edit, document.createTextNode(" "), remove);
  }
}

async function loadModules(courseId, select, placeholder) {
  const modules = courseId ? (modulesByCourse.get(courseId) || await getCourseModules(courseId)) : [];
  if (courseId && !modulesByCourse.has(courseId)) modulesByCourse.set(courseId, modules);
  fillSelect(select, placeholder, modules, (item) => item.id, (item) => "Module " + item.order + ": " + item.title);
  return modules;
}

async function loadData() {
  showStatus("Loading courses and lessons from the database...", "loading");
  try {
    courses = await getCourses();
    modulesByCourse = new Map();
    await Promise.all(courses.map(async (course) => {
      modulesByCourse.set(course.id, await getCourseModules(course.id));
    }));
    fillSelect(courseSelect, "Choose a course", courses, (item) => item.id, (item) => item.title);
    fillSelect(filterCourse, "All courses", courses, (item) => item.id, (item) => item.title);
    fillSelect(filterModule, "All modules", [], (item) => item.id, (item) => item.title);
    renderLessons();
    showStatus("Courses and lessons loaded from the database.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  }
}

courseSelect.addEventListener("change", async () => {
  await loadModules(courseSelect.value, moduleSelect, "Choose a module");
});

filterCourse.addEventListener("change", async () => {
  const modules = await loadModules(filterCourse.value, filterModule, "All modules");
  filterModule.value = "";
  renderLessons();
});

filterModule.addEventListener("change", renderLessons);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const courseId = courseSelect.value;
  const moduleId = moduleSelect.value;
  const title = form.querySelector("#lesson-title").value.trim();
  const content = form.querySelector("#lesson-content").value.trim();
  const order = Number(form.querySelector("#lesson-number").value);
  if (!courseId || !moduleId || !title || !content || !Number.isInteger(order) || order < 1) {
    showStatus("Choose a course and module, then enter a valid lesson number, title and content.", "error");
    return;
  }
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  showStatus("Saving lesson...", "loading");
  try {
    await expressRequest("/modules/" + encodeURIComponent(moduleId) + "/lessons", {
      method: "POST",
      body: { title, content, order },
    });
    form.reset();
    await loadData();
    courseSelect.value = courseId;
    await loadModules(courseId, moduleSelect, "Choose a module");
    showStatus("Lesson saved successfully.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    submit.disabled = false;
  }
});

filterCourse.addEventListener("change", renderLessons);
loadData();
