import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import {
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
} from "./pages/StudentPages.jsx";
import {
  AdminLoginPage,
  AdminDashboardPage,
  ManageCoursesPage,
  ManageStudentsPage,
  AddStudentPage,
  ManageModulesPage,
  ManageLessonsPage,
  ManageQuizzesPage,
  ManageAssessmentsPage,
} from "./admin/AdminPages.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/index.html" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/course-details" element={<CourseDetailsPage />} />
      <Route path="/student-dashboard" element={<StudentDashboardPage />} />
      <Route path="/my-courses" element={<MyCoursesPage />} />
      <Route path="/course-learning" element={<CourseLearningPage />} />
      <Route path="/module-quiz" element={<ModuleQuizPage />} />
      <Route path="/final-assessment" element={<FinalAssessmentPage />} />
      <Route path="/certificate" element={<CertificatePage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/admin/manage-courses" element={<ManageCoursesPage />} />
      <Route path="/admin/manage-students" element={<ManageStudentsPage />} />
      <Route path="/admin/add-student" element={<AddStudentPage />} />
      <Route path="/admin/manage-modules" element={<ManageModulesPage />} />
      <Route path="/admin/manage-lessons" element={<ManageLessonsPage />} />
      <Route path="/admin/manage-quizzes" element={<ManageQuizzesPage />} />
      <Route path="/admin/manage-assessments" element={<ManageAssessmentsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
