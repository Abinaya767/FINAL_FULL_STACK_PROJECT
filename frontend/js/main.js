import { initializeDashboard, initializeCoursePage, initializeMyCourses, enrollFromForm } from "./course.js";
import { initializeNavigation } from "./navigation.js";
import {
  initializeFinalAssessment,
  initializeLearningProgress,
  initializeModuleQuiz,
} from "./progress.js";
import {
  saveDemoProfile,
  startDemoSession,
} from "./storage.js";
import { initializeFormValidation } from "./validation.js";

function initializeLearnSpace() {
  initializeFormValidation({
    onRegistrationValid(form) {
      const name = form.querySelector("#fullname").value.trim();
      saveDemoProfile(name);
      return "Demo profile saved in this tab only. No account was created and your password was not stored.";
    },
    onLoginValid() {
      startDemoSession();
      return "Demo session started in this tab. Credentials were not verified; this is not authentication.";
    },
    onEnrollmentValid(form) {
      return enrollFromForm(form);
    },
  });

  initializeNavigation();
  initializeCoursePage();
  initializeDashboard();
  initializeMyCourses();
  initializeLearningProgress();
  initializeModuleQuiz();
  initializeFinalAssessment();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeLearnSpace, { once: true });
} else {
  initializeLearnSpace();
}
