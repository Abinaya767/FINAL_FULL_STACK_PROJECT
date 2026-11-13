import { getCourses } from "./src/api/courseApi.js";
import { expressRequest } from "./src/api/expressApi.js";

const form = document.querySelector("#assessment-form");
const courseSelect = document.querySelector("#assessment-course");
const questionCount = document.querySelector("#question-count");
const questionContainer = document.querySelector("#assessment-questions");
const tableBody = document.querySelector("#assessments-table tbody");
const status = document.querySelector("#assessment-status-message");
let courses = [];
let assessments = [];
let editingCourseId = null;

function showStatus(message, state = "") {
  status.textContent = message;
  status.dataset.state = state;
}

function buildQuestions(count, existing = []) {
  questionContainer.replaceChildren();
  for (let index = 0; index < count; index += 1) {
    const data = existing[index] || {};
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = "Question " + (index + 1);
    fieldset.append(legend);

    const promptLabel = document.createElement("label");
    promptLabel.textContent = "Question";
    const prompt = document.createElement("textarea");
    prompt.name = "question";
    prompt.required = true;
    prompt.rows = 2;
    prompt.value = data.question || "";
    promptLabel.append(prompt);
    fieldset.append(promptLabel);

    const options = Array.isArray(data.options) ? data.options : [];
    for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
      const label = document.createElement("label");
      label.textContent = "Option " + String.fromCharCode(65 + optionIndex);
      const input = document.createElement("input");
      input.name = "option";
      input.required = true;
      input.maxLength = 500;
      input.value = options[optionIndex] || "";
      label.append(input);
      fieldset.append(label);
    }

    const answerLabel = document.createElement("label");
    answerLabel.textContent = "Correct answer";
    const answer = document.createElement("select");
    answer.name = "correctAnswerIndex";
    answer.required = true;
    for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
      answer.add(new Option("Option " + String.fromCharCode(65 + optionIndex), String(optionIndex)));
    }
    answer.value = Number.isInteger(data.correctAnswerIndex) ? String(data.correctAnswerIndex) : "0";
    answerLabel.append(answer);
    fieldset.append(answerLabel);
    questionContainer.append(fieldset);
  }
}

function readQuestions() {
  return [...questionContainer.querySelectorAll("fieldset")].map((fieldset, index) => {
    const question = fieldset.querySelector('textarea[name="question"]').value.trim();
    const options = [...fieldset.querySelectorAll('input[name="option"]')].map((input) => input.value.trim());
    const correctAnswerIndex = Number(fieldset.querySelector('select[name="correctAnswerIndex"]').value);
    if (!question || options.length !== 4 || options.some((option) => !option)) {
      throw new Error("Complete the question and all four options for Question " + (index + 1) + ".");
    }
    return { question, options, correctAnswerIndex };
  });
}

function renderAssessments() {
  tableBody.replaceChildren();
  if (!assessments.length) {
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.textContent = "No final assessments have been created yet.";
    return;
  }
  for (const item of assessments) {
    const row = tableBody.insertRow();
    for (const value of [item.id, item.course.title, item.questions.length, item.passingPercentage + "%"]) {
      row.insertCell().textContent = String(value);
    }
    const actions = row.insertCell();
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => {
      editingCourseId = item.course.id;
      courseSelect.value = item.course.id;
      questionCount.value = String(item.questions.length);
      form.querySelector("#passing-percentage").value = String(item.passingPercentage);
      buildQuestions(item.questions.length, item.questions);
      form.querySelector('button[type="submit"]').textContent = "Update Assessment";
      showStatus("Edit the questions and save the updated assessment.", "success");
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!window.confirm("Delete the final assessment for " + item.course.title + "?")) return;
      remove.disabled = true;
      try {
        await expressRequest("/courses/" + encodeURIComponent(item.course.id) + "/assessment", { method: "DELETE" });
        assessments = assessments.filter((record) => record.course.id !== item.course.id);
        renderAssessments();
        showStatus("Final assessment deleted.", "success");
      } catch (error) {
        showStatus(error.message, "error");
        remove.disabled = false;
      }
    });
    actions.append(edit, document.createTextNode(" "), remove);
  }
}

async function loadData() {
  showStatus("Loading courses and final assessments...", "loading");
  try {
    const [courseList, assessmentResult] = await Promise.all([
      getCourses(),
      expressRequest("/admin/assessments"),
    ]);
    courses = courseList;
    courseSelect.replaceChildren(new Option("Choose a course", ""));
    courses.forEach((course) => courseSelect.add(new Option(course.title, course.id)));

    assessments = Array.isArray(assessmentResult.data?.assessments)
      ? assessmentResult.data.assessments
      : [];
    renderAssessments();
    showStatus("Saved courses and final assessments loaded from the database.", "success");
  } catch (error) {
    assessments = [];
    renderAssessments();
    showStatus("Could not load final assessments: " + error.message, "error");
  }
}

questionCount.addEventListener("change", () => buildQuestions(Number(questionCount.value)));
courseSelect.addEventListener("change", () => {
  if (editingCourseId && courseSelect.value !== editingCourseId) {
    editingCourseId = null;
    form.querySelector('button[type="submit"]').textContent = "Create Assessment";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const courseId = courseSelect.value;
  const passingPercentage = Number(form.querySelector("#passing-percentage").value);
  if (!courseId || !Number.isInteger(passingPercentage) || passingPercentage < 50 || passingPercentage > 100) {
    showStatus("Choose a course and a passing percentage between 50 and 100.", "error");
    return;
  }
  let questions;
  try {
    questions = readQuestions();
  } catch (error) {
    showStatus(error.message, "error");
    return;
  }
  if (questions.length < 20 || questions.length > 30) {
    showStatus("A final assessment must contain 20 to 30 questions.", "error");
    return;
  }
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  showStatus("Saving final assessment...", "loading");
  try {
    const isEditing = editingCourseId === courseId;
    const result = await expressRequest("/courses/" + encodeURIComponent(courseId) + "/assessment", {
      method: isEditing ? "PUT" : "POST",
      body: { questions, totalQuestions: questions.length, passingPercentage },
    });
    editingCourseId = null;
    form.reset();
    questionCount.value = "20";
    buildQuestions(20);
    submit.textContent = "Create Assessment";
    await loadData();
    showStatus(result.message || "Final assessment saved.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    submit.disabled = false;
  }
});

form.addEventListener("reset", () => {
  window.setTimeout(() => {
    editingCourseId = null;
    form.querySelector('button[type="submit"]').textContent = "Create Assessment";
    questionCount.value = "20";
    buildQuestions(20);
  }, 0);
});

buildQuestions(20);
loadData();
