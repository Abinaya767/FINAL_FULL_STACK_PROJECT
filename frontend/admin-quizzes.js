import { getCourses } from "./src/api/courseApi.js";
import { getCourseModules } from "./src/api/moduleApi.js";
import { expressRequest } from "./src/api/expressApi.js";

const courseSelect = document.querySelector("#quiz-course");
const moduleSelect = document.querySelector("#quiz-module");
const form = document.querySelector("main form");
const quizTableBody = [...document.querySelectorAll("main table tbody")][0];
const status = document.createElement("p");
status.className = "api-status";
status.setAttribute("role", "status");
status.setAttribute("aria-live", "polite");
form?.prepend(status);

let courses = [];
let modules = [];

function showStatus(message, state = "") {
  status.textContent = message;
  status.dataset.state = state;
}

function setOptions(select, placeholder, items, getValue, getLabel) {
  select.replaceChildren(new Option(placeholder, ""));
  for (const item of items) {
    select.add(new Option(getLabel(item), getValue(item)));
  }
}

function renderQuizRows() {
  quizTableBody.replaceChildren();
  const quizzes = [];
  for (const course of courses) {
    for (const module of course.modules || []) {
      if (module.quiz) {
        quizzes.push({ course, module, quiz: module.quiz });
      }
    }
  }

  if (!quizzes.length) {
    const row = quizTableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 7;
    cell.textContent = "No module quizzes have been created yet.";
    return;
  }

  for (const item of quizzes) {
    const row = quizTableBody.insertRow();
    const values = [
      item.quiz.id || "Saved quiz",
      item.course.title,
      item.module.title,
      `${item.module.title} Quiz`,
      String(item.quiz.questions?.length || 0),
      "2",
    ];
    for (const value of values) row.insertCell().textContent = value;
    const actions = row.insertCell();
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`Delete the quiz for "${item.module.title}"?`)) return;
      remove.disabled = true;
      showStatus("Deleting module quiz...", "loading");
      try {
        await expressRequest(`/modules/${encodeURIComponent(item.module.id)}/quiz`, {
          method: "DELETE",
        });
        item.module.quiz = null;
        renderQuizRows();
        showStatus("Module quiz deleted.", "success");
      } catch (error) {
        showStatus(error.message, "error");
        remove.disabled = false;
      }
    });
    actions.append(remove);
  }
}

async function loadCourses() {
  courseSelect.disabled = true;
  moduleSelect.disabled = true;
  setOptions(courseSelect, "Loading saved courses...", []);
  try {
    const savedCourses = await getCourses();
    courses = await Promise.all(savedCourses.map(async (course) => {
      try {
        const courseModules = await getCourseModules(course.id);
        return { ...course, modules: courseModules };
      } catch (error) {
        return { ...course, modules: [], moduleLoadError: error.message };
      }
    }));
    setOptions(courseSelect, courses.length ? "Choose Course" : "No admin-created courses found", courses,
      (course) => course.id, (course) => course.title);
    courseSelect.disabled = courses.length === 0;
    renderQuizRows();
    if (courses.some((course) => course.moduleLoadError)) {
      showStatus("Some course modules could not be loaded. Check your admin session and API.", "error");
    } else {
      showStatus(courses.length ? "Courses loaded from the database." : "Add a course in Manage Courses first.", courses.length ? "success" : "empty");
    }
  } catch (error) {
    setOptions(courseSelect, "Unable to load courses", []);
    showStatus(error.message, "error");
  }
}

courseSelect.addEventListener("change", () => {
  const selectedCourse = courses.find((course) => course.id === courseSelect.value);
  modules = selectedCourse?.modules || [];
  setOptions(moduleSelect, selectedCourse ? "Choose Module" : "Choose a course first",
    modules, (module) => module.id, (module) => `Module ${module.order}: ${module.title}`);
  moduleSelect.disabled = modules.length === 0;
  if (selectedCourse?.moduleLoadError) {
    showStatus(selectedCourse.moduleLoadError, "error");
  } else if (!modules.length && selectedCourse) {
    showStatus("No modules are available for this course yet.", "empty");
  } else {
    showStatus(selectedCourse ? "Only modules from the selected course are shown." : "Select a course first.", "success");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const selectedCourse = courses.find((course) => course.id === courseSelect.value);
  const selectedModule = modules.find((module) => module.id === moduleSelect.value);
  if (!selectedCourse || !selectedModule) {
    showStatus("Select a saved course and one of its modules.", "error");
    return;
  }
  if (selectedModule.quiz) {
    showStatus("This module already has a quiz. Delete it before creating a replacement.", "error");
    return;
  }

  const questions = [];
  for (let index = 0; index < 5; index += 1) {
    const question = form.querySelector(`[name="questions[${index}][text]"]`);
    const options = [0, 1, 2, 3].map((optionIndex) =>
      form.querySelector(`[name="questions[${index}][options][${optionIndex}]"]`).value.trim());
    const answer = form.querySelector(`[name="questions[${index}][correctAnswer]"]`).value;
    if (!question.value.trim() || options.some((option) => !option) || answer === "") {
      showStatus(`Complete the question, all four options and correct answer for Question ${index + 1}.`, "error");
      return;
    }
    questions.push({
      question: question.value.trim(),
      options,
      correctAnswerIndex: Number(answer),
    });
  }

  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  showStatus("Saving quiz to the database...", "loading");
  try {
    await expressRequest(`/modules/${encodeURIComponent(selectedModule.id)}/quiz`, {
      method: "POST",
      body: { questions },
    });
    selectedModule.quiz = { questions };
    renderQuizRows();
    form.reset();
    moduleSelect.value = selectedModule.id;
    form.querySelector("#attempt-limit").value = "2";
    showStatus("Quiz saved successfully and linked to the selected course module.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    submit.disabled = false;
  }
});

form.addEventListener("reset", () => {
  window.setTimeout(() => {
    form.querySelector("#attempt-limit").value = "2";
  }, 0);
});

loadCourses();
