import { expressRequest } from "../src/api/expressApi.js";

const fields = {
  totalStudents: document.querySelector("#total-students"),
  totalCourses: document.querySelector("#total-courses"),
  totalEnrollments: document.querySelector("#total-enrollments"),
  completedCourses: document.querySelector("#completed-courses"),
};
const status = document.querySelector("#dashboard-stats-status");

async function loadDashboardStatistics() {
  if (Object.values(fields).some((element) => !element)) return;
  if (status) status.textContent = "Loading live database statistics...";
  try {
    const result = await expressRequest("/admin/dashboard/statistics");
    const statistics = result.data;
    for (const [key, element] of Object.entries(fields)) {
      const value = statistics[key];
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error("The dashboard received invalid statistics from the server.");
      }
      element.textContent = value.toLocaleString();
    }
    if (status) status.textContent = "Statistics updated from the database.";
  } catch (error) {
    for (const element of Object.values(fields)) element.textContent = "—";
    if (status) status.textContent = error.status === 401 || error.status === 403
      ? "Please sign in with an administrator account to view platform statistics."
      : error.message;
  }
}

loadDashboardStatistics();
