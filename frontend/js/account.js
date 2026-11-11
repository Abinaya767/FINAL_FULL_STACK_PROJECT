import { getStudent, updateStudent } from "../src/api/studentApi.js";
import { getAuthSession } from "../src/api/authSession.js";

export async function initializeStudentProfile() {
  const form = document.querySelector("#student-profile-form");
  if (!form) return;
  const status = form.querySelector(".api-status") || document.createElement("p");
  status.className = "api-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  if (!status.isConnected) form.append(status);

  const session = getAuthSession();
  if (!session?.user?.id) {
    status.textContent = "Sign in again to view your student profile.";
    status.dataset.state = "error";
    return;
  }

  const name = form.elements.namedItem("name");
  const phone = form.elements.namedItem("phone");
  const college = form.elements.namedItem("college");
  const department = form.elements.namedItem("department");
  const yearOfStudy = form.elements.namedItem("yearOfStudy");
  const submit = form.querySelector('button[type="submit"]');
  status.textContent = "Loading your saved profile...";
  status.dataset.state = "loading";
  submit.disabled = true;
  try {
    const student = await getStudent(session.user.id);
    name.value = student.name;
    phone.value = student.phone;
    college.value = student.college;
    department.value = student.department;
    yearOfStudy.value = student.yearOfStudy ?? "";
    status.textContent = "";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      status.textContent = "Saving your profile...";
      status.dataset.state = "loading";
      try {
        const updated = await updateStudent(session.user.id, {
          name: name.value.trim(),
          phone: phone.value.trim(),
          college: college.value.trim(),
          department: department.value.trim(),
          ...(yearOfStudy.value ? { yearOfStudy: Number(yearOfStudy.value) } : {}),
        });
        const welcome = [...document.querySelectorAll("main > section")]
          .find((section) => section.querySelector("h2")?.textContent.trim() === "Welcome to Your Dashboard!");
        if (welcome) {
          const heading = welcome.querySelector("h2");
          heading.textContent = `Welcome, ${updated.name}!`;
        }
        status.textContent = "Profile changes saved.";
        status.dataset.state = "success";
      } catch (error) {
        status.textContent = error.message;
        status.dataset.state = "error";
      } finally {
        submit.disabled = false;
      }
    });
  } catch (error) {
    status.textContent = error.message;
    status.dataset.state = "error";
  } finally {
    submit.disabled = false;
  }
}
