import React from "react";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearAuthSession } from "./api/authSession.js";

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
  "/admin/login": "/admin-login.html",
  "/admin/dashboard": "/admin-dashboard.html",
  "/admin/manage-courses": "/manage-courses.html",
  "/admin/manage-students": "/manage-students.html",
  "/admin/add-student": "/add-student.html",
  "/admin/manage-modules": "/manage-modules.html",
  "/admin/manage-lessons": "/manage-lessons.html",
  "/admin/manage-quizzes": "/manage-quizzes.html",
  "/admin/manage-assessments": "/manage-assessments.html",
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

    const handleApiUnauthorized = (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;

      if (event.data?.type === "learnspace:unauthorized") {
        clearAuthSession();
        navigate("/login", {
          state: {
            from: { pathname: location.pathname, search: location.search, hash: location.hash },
            message: "Your session has expired. Please sign in again.",
          },
          replace: true,
        });
        return;
      }

      if (event.data?.type === "learnspace:auth-required") {
        navigate("/login", {
          state: {
            from: { pathname: location.pathname, search: location.search, hash: location.hash },
          },
          replace: true,
        });
      }
    };
    window.addEventListener("message", handleApiUnauthorized);

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
          clearAuthSession();
        }
        navigate(route);
      };

      frameDocument.addEventListener("click", handleLinkClick);
      frame.__learnSpaceLinkHandler = handleLinkClick;
    };

    frame.addEventListener("load", handleLoad);
    const frameUrl = new URL(legacyPath, window.location.origin);
    frameUrl.search = location.search;
    frameUrl.searchParams.set("embed", "1");
    frame.src = `${frameUrl.pathname}${frameUrl.search}`;
    return () => {
      window.removeEventListener("message", handleApiUnauthorized);
      frame.removeEventListener("load", handleLoad);
      if (frame.contentDocument && frame.__learnSpaceLinkHandler) {
        frame.contentDocument.removeEventListener("click", frame.__learnSpaceLinkHandler);
      }
    };
  }, [legacyPath, location.pathname, location.search, location.hash, navigate]);

  return (
    <iframe
      ref={frameRef}
      className="legacy-page-frame"
      title={title}
      referrerPolicy="same-origin"
    />
  );
}
