import { initializeDashboard, initializeCoursePage, initializeMyCourses } from "./course.js";
import { initializeNavigation } from "./navigation.js";
import { initializeStudentProfile } from "./account.js";
import { initializeAddStudent, initializeAdminCourses, initializeAdminStudents } from "./admin.js";
import {
  initializeCertificate,
  initializeFinalAssessment,
  initializeLearningProgress,
  initializeModuleQuiz,
  initializeNotifications,
} from "./progress.js";
import { expressRequest } from "../src/api/expressApi.js";
import { saveAuthSession } from "../src/api/authSession.js";
import { initializeFormValidation } from "./validation.js";

function initializeLearnSpace() {
  initializeFormValidation({
    async onRegistrationValid(form) {
      const result = await expressRequest("/auth/register", {
        method: "POST",
        body: {
          name: form.querySelector("#fullname").value.trim(),
          email: form.querySelector("#email").value.trim(),
          password: form.querySelector("#password").value,
          phone: form.querySelector("#phone").value.trim(),
          college: form.querySelector("#college").value.trim(),
          department: form.querySelector("#department").value.trim(),
          yearOfStudy: Number(form.querySelector("#year").value),
        },
      });
      return result.message;
    },
    async onLoginValid(form) {
      const result = await expressRequest("/auth/login", {
        method: "POST",
        body: {
          email: form.querySelector("#email").value.trim(),
          password: form.querySelector("#password").value,
        },
      });
      if (result.user.role !== "student") throw new Error("Use the administrator login page for this account.");
      saveAuthSession(result.token, result.user);
      return "Login successful.";
    },
    async onAdminLoginValid(form) {
      const result = await expressRequest("/auth/login", {
        method: "POST",
        body: {
          email: form.querySelector("#admin-email").value.trim(),
          password: form.querySelector("#admin-password").value,
        },
      });
      if (result.user.role !== "admin") throw new Error("Use a student login for this account.");
      saveAuthSession(result.token, result.user);
      return "Administrator login successful.";
    },
  });

  initializeNavigation();
  void initializeCoursePage();
  void initializeDashboard();
  void initializeMyCourses();
  void initializeLearningProgress();
  void initializeModuleQuiz();
  void initializeFinalAssessment();
  void initializeCertificate();
  void initializeNotifications();
  void initializeStudentProfile();
  void initializeAddStudent();
  void initializeAdminStudents();
  void initializeAdminCourses();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeLearnSpace, { once: true });
} else {
  initializeLearnSpace();
}
