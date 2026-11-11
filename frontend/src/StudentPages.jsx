import { useState } from "react";
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LegacyPage from "./LegacyPage.jsx";
import { expressRequest } from "./api/expressApi.js";
import { useAuth } from "./AuthContext.jsx";

function AuthenticationForm({ admin = false, registration = false }) {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const details = Object.fromEntries(form.entries());

    try {
      if (registration) {
        await expressRequest("/auth/register", { method: "POST", body: details });
        navigate("/login", { state: { message: "Registration successful. Sign in with your new account." } });
        return;
      }

      const result = await expressRequest("/auth/login", { method: "POST", body: details });
      if (result.user.role !== (admin ? "admin" : "student")) {
        throw new Error(admin ? "Use an administrator account to sign in here." : "Use the student login page for this account.");
      }
      login(result.token, result.user);
      const returnPath = location.state?.from?.pathname;
      const safeReturnPath = typeof returnPath === "string"
        && returnPath.startsWith("/")
        && !returnPath.startsWith("//")
        && !returnPath.includes("\\")
        ? returnPath
        : null;
      navigate(safeReturnPath || (admin ? "/admin/dashboard" : "/student-dashboard"), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>{registration ? "Student Registration" : admin ? "Administrator Login" : "Student Login"}</h1>
        {registration && (
          <label>
            Name
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete={registration ? "new-password" : "current-password"} required minLength={registration ? 8 : undefined} />
        </label>
        {registration && (
          <label>
            Phone
            <input name="phone" type="tel" autoComplete="tel" required />
          </label>
        )}
        {registration && (
          <>
            <label>
              College
              <input name="college" autoComplete="organization" required maxLength={200} />
            </label>
            <label>
              Department
              <input name="department" required maxLength={200} />
            </label>
            <label>
              Year of Study
              <input name="yearOfStudy" type="number" min="1" max="20" step="1" required />
            </label>
          </>
        )}
        {error && <p role="alert">{error}</p>}
        {!registration && location.state?.message && <p role="status">{location.state.message}</p>}
        <button type="submit" disabled={submitting}>{submitting ? "Please wait..." : registration ? "Create account" : "Sign in"}</button>
        {!registration && !admin && <p>New to LearnSpace? <Link to="/register">Create a student account</Link></p>}
        {registration && <p>Already registered? <Link to="/login">Sign in</Link></p>}
        {!registration && !admin && <p><Link to="/admin/login">Administrator sign in</Link></p>}
      </form>
    </main>
  );
}

export function LoginPage() {
  return <AuthenticationForm />;
}

export function AdminLoginPage() {
  return <AuthenticationForm admin />;
}

export function RegisterPage() {
  return <AuthenticationForm registration />;
}

export function CoursesPage() {
  return <LegacyPage title="Courses" />;
}

export function CourseDetailsPage() {
  return <LegacyPage title="Course Details" />;
}

export function StudentDashboardPage() {
  return <LegacyPage title="Student Dashboard" />;
}

export function MyCoursesPage() {
  return <LegacyPage title="My Courses" />;
}

export function CourseLearningPage() {
  return <LegacyPage title="Course Learning" />;
}

export function ModuleQuizPage() {
  return <LegacyPage title="Module Quiz" />;
}

export function FinalAssessmentPage() {
  return <LegacyPage title="Final Assessment" />;
}

export function CertificatePage() {
  return <LegacyPage title="Certificate" />;
}

export function NotificationsPage() {
  return <LegacyPage title="Notifications" />;
}
