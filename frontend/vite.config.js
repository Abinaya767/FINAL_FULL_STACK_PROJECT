import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = dirname(fileURLToPath(import.meta.url));
const htmlEntrypoints = Object.fromEntries(
  readdirSync(projectDirectory)
    .filter((file) => file.endsWith(".html"))
    .map((file) => [file.slice(0, -5), resolve(projectDirectory, file)]),
);

const reactRoutes = new Set([
  "/", "/index.html", "/login", "/register", "/courses", "/course-details",
  "/student-dashboard", "/my-courses", "/course-learning", "/module-quiz",
  "/final-assessment", "/certificate", "/notifications", "/chat",
  "/admin/login", "/admin/dashboard", "/admin/manage-courses",
  "/admin/manage-students", "/admin/add-student", "/admin/manage-modules",
  "/admin/manage-lessons", "/admin/manage-quizzes", "/admin/manage-assessments",
]);

const legacyRouteRedirects = new Map([
  ["/login.html", "/login"], ["/register.html", "/register"],
  ["/admin-login.html", "/admin/login"], ["/student-dashboard.html", "/student-dashboard"],
  ["/my-courses.html", "/my-courses"], ["/course-learning.html", "/course-learning"],
  ["/module-quiz.html", "/module-quiz"], ["/final-assessment.html", "/final-assessment"],
  ["/certificate.html", "/certificate"], ["/notifications.html", "/notifications"],
  ["/admin-dashboard.html", "/admin/dashboard"], ["/manage-courses.html", "/admin/manage-courses"],
  ["/manage-students.html", "/admin/manage-students"], ["/add-student.html", "/admin/add-student"],
  ["/manage-modules.html", "/admin/manage-modules"], ["/manage-lessons.html", "/admin/manage-lessons"],
  ["/manage-quizzes.html", "/admin/manage-quizzes"], ["/manage-assessments.html", "/admin/manage-assessments"],
]);

function rewriteReactRoutes(server) {
  server.middlewares.use((request, response, next) => {
    const url = new URL(request.url, "http://localhost");
    const redirect = legacyRouteRedirects.get(url.pathname);
    if (request.method === "GET" && redirect && url.searchParams.get("embed") !== "1") {
      response.statusCode = 302;
      response.setHeader("Location", `${redirect}${url.search}`);
      response.end();
      return;
    }
    if (request.method === "GET" && reactRoutes.has(url.pathname)) {
      request.url = `/index.html${url.search}`;
    }
    next();
  });
}

export default defineConfig({
  root: projectDirectory,
  plugins: [react(), {
    name: "learnspace-react-route-fallback",
    configureServer: rewriteReactRoutes,
    configurePreviewServer: rewriteReactRoutes,
  }],
  build: {
    outDir: resolve(projectDirectory, "dist"),
    emptyOutDir: true,
    rollupOptions: { input: htmlEntrypoints },
  },
});
