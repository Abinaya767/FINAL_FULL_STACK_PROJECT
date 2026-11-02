import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearDemoState } from "../../js/storage.js";

const legacyPathByRoute = {
  "/login": "/login.html",
  "/register": "/register.html",
  "/courses": "/courses.html",
  "/course-details": "/course-details.html",
  "/student-dashboard": "/student-dashboard.html",
  "/my-courses": "/my-courses.html",
  "/course-learning": "/course-learning.html",
  "/module-quiz": "/module-quiz.html",
  "/final-assessment": "/final-assessment.html",
  "/certificate": "/certificate.html",
  "/notifications": "/notifications.html",
  "/admin/login": "/admin/admin-login.html",
  "/admin/dashboard": "/admin/admin-dashboard.html",
  "/admin/manage-courses": "/admin/manage-courses.html",
  "/admin/manage-students": "/admin/manage-students.html",
  "/admin/add-student": "/admin/add-student.html",
  "/admin/manage-modules": "/admin/manage-modules.html",
  "/admin/manage-lessons": "/admin/manage-lessons.html",
  "/admin/manage-quizzes": "/admin/manage-quizzes.html",
  "/admin/manage-assessments": "/admin/manage-assessments.html",
};

const routeByLegacyPath = Object.fromEntries(
  Object.entries(legacyPathByRoute).map(([route, legacyPath]) => [legacyPath, route]),
);
routeByLegacyPath["/index.html"] = "/";

export function legacyUrlToRoute(href, baseUrl) {
  const url = new URL(href, baseUrl);
  if (url.origin !== window.location.origin) {
    return null;
  }
  const route = routeByLegacyPath[url.pathname];
  return route ? `${route}${url.search}${url.hash}` : null;
}

export default function LegacyPage({ title }) {
  const frameRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const legacyPath = legacyPathByRoute[location.pathname];

  useEffect(() => {
    document.title = `${title} | LearnSpace`;
  }, [title]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return undefined;
    }

    const handleLoad = () => {
      const frameDocument = frame.contentDocument;
      if (!frameDocument) {
        return;
      }

      const handleLinkClick = (event) => {
        const link = event.target.closest("a[href]");
        if (!link || link.hasAttribute("download") || link.target) {
          return;
        }

        const href = link.getAttribute("href");
        if (!href || href.startsWith("#")) {
          return;
        }

        const route = legacyUrlToRoute(href, frame.contentWindow.location.href);
        if (!route) {
          return;
        }

        event.preventDefault();
        if (link.textContent.trim().toLowerCase() === "logout") {
          clearDemoState();
        }
        navigate(route);
      };

      frameDocument.addEventListener("click", handleLinkClick);
      frame.__learnSpaceLinkHandler = handleLinkClick;
    };

    frame.addEventListener("load", handleLoad);
    frame.src = `${legacyPath}${location.search}`;
    return () => {
      frame.removeEventListener("load", handleLoad);
      if (frame.contentDocument && frame.__learnSpaceLinkHandler) {
        frame.contentDocument.removeEventListener("click", frame.__learnSpaceLinkHandler);
      }
    };
  }, [legacyPath, location.search, navigate]);

  return (
    <iframe
      ref={frameRef}
      className="legacy-page-frame"
      title={title}
      referrerPolicy="same-origin"
    />
  );
}
