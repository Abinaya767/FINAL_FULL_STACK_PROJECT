import { createCourse, deleteCourse, getCourses, updateCourse } from "../src/api/courseApi.js";
import { createStudent, deleteStudent, getStudents, updateStudent } from "../src/api/studentApi.js";

function getStatus(container, className = "api-status") {
  let status = container.querySelector(`.${className}`);
  if (!status) {
    status = document.createElement("p");
    status.className = className;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    container.prepend(status);
  }
  return status;
}

function addField(form, labelText, name, value, { required = false, type = "text" } = {}) {
  const label = document.createElement("label");
  label.append(document.createTextNode(labelText));
  const input = document.createElement("input");
  input.name = name;
  input.type = type;
  input.value = value ?? "";
  input.required = required;
  label.append(input);
  form.append(label);
  return input;
}

export async function initializeAddStudent() {
  const form = document.querySelector("form:has(#student-name)");
  if (!form) return;
  const status = getStatus(form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    const body = {
      name: values.get("fullName").trim(),
      email: values.get("email").trim(),
      phone: values.get("phone").trim(),
      college: values.get("college").trim(),
      department: values.get("department").trim(),
      yearOfStudy: Number(values.get("yearOfStudy")),
      password: values.get("password"),
    };
    submit.disabled = true;
    status.textContent = "Creating student account...";
    status.dataset.state = "loading";
    try {
      const student = await createStudent(body);
      status.textContent = `Student ${student.name} was saved.`;
      status.dataset.state = "success";
      form.reset();
    } catch (error) {
      status.textContent = error.message;
      status.dataset.state = "error";
    } finally {
      submit.disabled = false;
    }
  });
}

export async function initializeAdminStudents() {
  const table = [...document.querySelectorAll("main table")]
    .find((candidate) => candidate.querySelector("thead th")?.textContent.includes("Student ID"));
  if (!table) return;
  const body = table.querySelector("tbody");
  const status = getStatus(table.parentElement);
  const searchForm = [...document.querySelectorAll("main form")]
    .find((form) => form.querySelector("#search-student"));
  const searchInput = searchForm?.querySelector("#search-student");
  let students = [];

  const render = () => {
    const query = searchInput?.value.trim().toLowerCase() ?? "";
    const matching = students.filter((student) => (
      `${student.name} ${student.email}`.toLowerCase().includes(query)
    ));
    body.replaceChildren();
    if (!matching.length) {
      const row = body.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 8;
      cell.textContent = query ? "No students match your search." : "No student records are available.";
      return;
    }
    for (const student of matching) {
      const row = body.insertRow();
      for (const value of [
        student.id,
        student.name,
        student.email,
        student.college || "",
        student.department || "",
        student.yearOfStudy ?? "",
        (student.enrolledCourses ?? []).join(", ") || "No enrollments",
      ]) {
        row.insertCell().textContent = String(value);
      }
      const actions = row.insertCell();
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => editStudent(row, student));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Delete";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Delete the student account for ${student.name}? This also deletes its learning records.`)) return;
        remove.disabled = true;
        status.textContent = "Deleting student...";
        status.dataset.state = "loading";
        try {
          await deleteStudent(student.id);
          students = students.filter((item) => item.id !== student.id);
          status.textContent = "Student and associated learning records deleted.";
          status.dataset.state = "success";
          render();
        } catch (error) {
          status.textContent = error.message;
          status.dataset.state = "error";
          remove.disabled = false;
        }
      });
      actions.append(edit, document.createTextNode(" "), remove);
    }
  };

  function editStudent(row, student) {
    const editorRow = document.createElement("tr");
    const cell = editorRow.insertCell();
    cell.colSpan = 8;
    const form = document.createElement("form");
    for (const [label, name, value] of [
      ["Full Name", "name", student.name],
      ["Email", "email", student.email],
      ["Phone", "phone", student.phone],
      ["College", "college", student.college],
      ["Department", "department", student.department],
      ["Year of Study", "yearOfStudy", student.yearOfStudy],
    ]) {
      addField(form, label, name, value, { type: name === "yearOfStudy" ? "number" : "text" });
    }
    const save = document.createElement("button");
    save.type = "submit";
    save.textContent = "Save";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => editorRow.remove());
    form.append(save, cancel);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = new FormData(form);
      const changes = {
        name: values.get("name").trim(),
        email: values.get("email").trim(),
        phone: values.get("phone").trim(),
        college: values.get("college").trim(),
        department: values.get("department").trim(),
      };
      if (values.get("yearOfStudy")) changes.yearOfStudy = Number(values.get("yearOfStudy"));
      save.disabled = true;
      status.textContent = "Saving student profile...";
      status.dataset.state = "loading";
      try {
        await updateStudent(student.id, changes);
        students = await getStudents();
        status.textContent = "Student profile saved.";
        status.dataset.state = "success";
        render();
      } catch (error) {
        status.textContent = error.message;
        status.dataset.state = "error";
        save.disabled = false;
      }
    });
    cell.append(form);
    row.after(editorRow);
  }

  status.textContent = "Loading student records...";
  status.dataset.state = "loading";
  try {
    students = await getStudents();
    status.textContent = "";
    render();
    searchForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      render();
    });
    searchInput?.addEventListener("input", render);
  } catch (error) {
    status.textContent = error.message;
    status.dataset.state = "error";
  }
}

export async function initializeAdminCourses() {
  const section = [...document.querySelectorAll("main section")]
    .find((candidate) => candidate.querySelector("h2")?.textContent.trim() === "Add New Course");
  const form = section?.querySelector("form");
  const table = [...document.querySelectorAll("main table")]
    .find((candidate) => candidate.querySelector("thead th")?.textContent.includes("Course ID"));
  if (!form || !table) return;

  const status = getStatus(section);
  const body = table.querySelector("tbody");
  const curriculum = form.querySelector('[name="modules"]');
  const render = (courses) => {
    body.replaceChildren();
    if (!courses.length) {
      const row = body.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 6;
      cell.textContent = "No saved course records are available.";
      return;
    }
    for (const course of courses) {
      const row = body.insertRow();
      for (const value of [course.id, course.title, course.category, course.duration, course.demo ? "Demo" : "Standard"]) {
        row.insertCell().textContent = value || "";
      }
      const actions = row.insertCell();
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => editCourse(row, course));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Delete";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Delete "${course.title}" and its associated learning records?`)) return;
        remove.disabled = true;
        status.textContent = "Deleting course...";
        status.dataset.state = "loading";
        try {
          await deleteCourse(course.id);
          courses = courses.filter((item) => item.id !== course.id);
          status.textContent = "Course and associated learning records deleted.";
          status.dataset.state = "success";
          render(courses);
        } catch (error) {
          status.textContent = error.message;
          status.dataset.state = "error";
          remove.disabled = false;
        }
      });
      actions.append(edit, document.createTextNode(" "), remove);
    }
  };

  function editCourse(row, course) {
    const editorRow = document.createElement("tr");
    const cell = editorRow.insertCell();
    cell.colSpan = 6;
    const editForm = document.createElement("form");
    const controls = {};
    for (const [label, name, value] of [
      ["Course Name", "title", course.title],
      ["Description", "description", course.description],
      ["Category", "category", course.category],
      ["Duration", "duration", course.duration],
      ["Level", "level", course.level],
      ["Instructor", "instructor", course.instructor],
    ]) {
      controls[name] = addField(editForm, label, name, value, { required: true });
    }
    const demoLabel = document.createElement("label");
    const demo = document.createElement("input");
    demo.type = "checkbox";
    demo.name = "demo";
    demo.checked = course.demo;
    demoLabel.append(demo, document.createTextNode(" Demo course"));
    editForm.append(demoLabel);
    const save = document.createElement("button");
    save.type = "submit";
    save.textContent = "Save";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => editorRow.remove());
    editForm.append(save, cancel);
    editForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      save.disabled = true;
      status.textContent = "Saving course...";
      status.dataset.state = "loading";
      try {
        await updateCourse(course.id, {
          title: controls.title.value.trim(),
          description: controls.description.value.trim(),
          category: controls.category.value.trim(),
          duration: controls.duration.value.trim(),
          level: controls.level.value.trim(),
          instructor: controls.instructor.value.trim(),
          demo: demo.checked,
        });
        const updatedCourses = await getCourses();
        status.textContent = "Course saved.";
        status.dataset.state = "success";
        render(updatedCourses);
      } catch (error) {
        status.textContent = error.message;
        status.dataset.state = "error";
        save.disabled = false;
      }
    });
    cell.append(editForm);
    row.after(editorRow);
  }

  const loadCourses = async () => {
    status.textContent = "Loading saved courses...";
    status.dataset.state = "loading";
    try {
      const courses = await getCourses();
      status.textContent = "";
      render(courses);
    } catch (error) {
      status.textContent = error.message;
      status.dataset.state = "error";
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    let modules;
    try {
      modules = JSON.parse(curriculum.value);
    } catch {
      status.textContent = "Curriculum must be valid JSON containing at least 10 complete modules.";
      status.dataset.state = "error";
      return;
    }
    const course = {
      title: values.get("courseName").trim(),
      description: values.get("description").trim(),
      category: values.get("category").trim(),
      duration: values.get("duration").trim(),
      level: values.get("level").trim(),
      instructor: values.get("instructor").trim(),
      demo: values.get("demo") === "on",
      modules,
    };
    submit.disabled = true;
    status.textContent = "Saving course and curriculum...";
    status.dataset.state = "loading";
    try {
      await createCourse(course);
      status.textContent = "Course and curriculum saved.";
      status.dataset.state = "success";
      form.reset();
      await loadCourses();
    } catch (error) {
      status.textContent = error.message;
      status.dataset.state = "error";
    } finally {
      submit.disabled = false;
    }
  });

  await loadCourses();
}
