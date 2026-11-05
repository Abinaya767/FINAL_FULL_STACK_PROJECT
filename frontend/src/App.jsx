import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./HomePage.jsx";
import {
  AdminLoginPage,
  LoginPage,
  RegisterPage,
  CoursesPage,
  CourseDetailsPage,
  StudentDashboardPage,
  MyCoursesPage,
  CourseLearningPage,
  ModuleQuizPage,
  FinalAssessmentPage,
  CertificatePage,
  NotificationsPage,
} from "./StudentPages.jsx";
import LegacyPage from "./LegacyPage.jsx";
import NotFoundPage from "./NotFoundPage.jsx";
import { useAuth } from "./AuthContext.jsx";

function ProtectedRoute({ role, children }) {
  const { sessionError, user } = useAuth();
  const location = useLocation();

  if (sessionError) {
    return <p role="alert">{sessionError}</p>;
  }
  if (!user) {
    return <Navigate to={role === "admin" ? "/admin/login" : "/login"} state={{ from: location }} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/student-dashboard"} replace />;
  }
  return children;
}

function AdminPage({ title }) {
  return <LegacyPage title={title} />;
}

function protectedStudentPage(element) {
  return <ProtectedRoute role="student">{element}</ProtectedRoute>;
}

function protectedAdminPage(title) {
  return (
    <ProtectedRoute role="admin">
      <AdminPage title={title} />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/index.html" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/course-details" element={<CourseDetailsPage />} />
      <Route path="/student-dashboard" element={protectedStudentPage(<StudentDashboardPage />)} />
      <Route path="/my-courses" element={protectedStudentPage(<MyCoursesPage />)} />
      <Route path="/course-learning" element={protectedStudentPage(<CourseLearningPage />)} />
      <Route path="/module-quiz" element={protectedStudentPage(<ModuleQuizPage />)} />
      <Route path="/final-assessment" element={protectedStudentPage(<FinalAssessmentPage />)} />
      <Route path="/certificate" element={protectedStudentPage(<CertificatePage />)} />
      <Route path="/notifications" element={protectedStudentPage(<NotificationsPage />)} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/dashboard" element={protectedAdminPage("Admin Dashboard")} />
      <Route path="/admin/manage-courses" element={protectedAdminPage("Manage Courses")} />
      <Route path="/admin/manage-students" element={protectedAdminPage("Manage Students")} />
      <Route path="/admin/add-student" element={protectedAdminPage("Add Student")} />
      <Route path="/admin/manage-modules" element={protectedAdminPage("Manage Modules")} />
      <Route path="/admin/manage-lessons" element={protectedAdminPage("Manage Lessons")} />
      <Route path="/admin/manage-quizzes" element={protectedAdminPage("Manage Quizzes")} />
      <Route path="/admin/manage-assessments" element={protectedAdminPage("Manage Assessments")} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
