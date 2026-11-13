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
  const [role, setRole] = useState(admin ? "admin" : "student");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = role === "admin" && !registration;

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
      if (result.user.role !== (isAdmin ? "admin" : "student")) {
        throw new Error(isAdmin ? "Use an administrator account to sign in here." : "Use a student account to sign in here.");
      }
      login(result.token, result.user);
      const returnLocation = location.state?.from;
      const returnPath = returnLocation?.pathname;
      const safeReturnPath = typeof returnPath === "string"
        && returnPath.startsWith("/") && !returnPath.startsWith("//") && !returnPath.includes("\\")
        ? `${returnPath}${typeof returnLocation.search === "string" ? returnLocation.search : ""}${typeof returnLocation.hash === "string" ? returnLocation.hash : ""}`
        : null;
      navigate(safeReturnPath || (isAdmin ? "/admin/dashboard" : "/student-dashboard"), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-label={registration ? "Student registration" : "LearnSpace sign in"}>
        {!registration && (
          <aside className="auth-role-panel">
            <p className="auth-eyebrow">WELCOME TO LEARNSPACE</p>
            <h1>Learning made clear and simple.</h1>
            <p>Choose how you want to sign in to continue.</p>
            <div className="auth-role-options" role="group" aria-label="Choose account type">
              <button type="button" className={role === "admin" ? "active" : ""} aria-pressed={role === "admin"} onClick={() => { setRole("admin"); setError(""); }}>
                <strong>Administrator</strong><span>Manage students and courses</span>
              </button>
              <button type="button" className={role === "student" ? "active" : ""} aria-pressed={role === "student"} onClick={() => { setRole("student"); setError(""); }}>
                <strong>Student</strong><span>Continue your learning</span>
              </button>
            </div>
            <Link to="/">Back to Home</Link>
          </aside>
        )}
        <form className="auth-form" onSubmit={handleSubmit}>
          <p className="auth-eyebrow">{registration ? "JOIN LEARNSPACE" : isAdmin ? "ADMINISTRATOR ACCESS" : "STUDENT ACCESS"}</p>
          <h2>{registration ? "Create your account" : isAdmin ? "Admin Login" : "Student Login"}</h2>
          <p className="auth-intro">{registration ? "Create your student account to start learning." : "Enter your account details to continue."}</p>
          {registration && <label>Full Name<input name="name" autoComplete="name" required maxLength={120} /></label>}
          <label>Email Address<input name="email" type="email" autoComplete="username" required /></label>
          <label>Password<input name="password" type="password" autoComplete={registration ? "new-password" : "current-password"} required minLength={registration ? 8 : undefined} /></label>
          {registration && <label>Phone Number<input name="phone" type="tel" autoComplete="tel" required /></label>}
          {registration && <label>College<input name="college" autoComplete="organization" required maxLength={200} /></label>}
          {registration && <label>Department<input name="department" required maxLength={200} /></label>}
          {registration && <label>Year of Study<input name="yearOfStudy" type="number" min="1" max="20" step="1" required /></label>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          {!registration && location.state?.message && <p className="auth-message" role="status">{location.state.message}</p>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "Please wait..." : registration ? "Create Account" : "Sign In"}</button>
          {!registration && !isAdmin && <p className="auth-footnote">New to LearnSpace? <Link to="/register">Create a student account</Link></p>}
          {isAdmin && <p className="auth-footnote">Administrator access is restricted to authorized accounts.</p>}
          {registration && <p className="auth-footnote">Already registered? <Link to="/login">Sign in</Link></p>}
        </form>
      </section>
    </main>
  );
}

export function LoginPage() { return <AuthenticationForm />; }
export function AdminLoginPage() { return <AuthenticationForm admin />; }
export function RegisterPage() { return <AuthenticationForm registration />; }
export function CoursesPage() { return <LegacyPage title="Courses" />; }
export function CourseDetailsPage() { return <LegacyPage title="Course Details" />; }
export function StudentDashboardPage() { return <LegacyPage title="Student Dashboard" />; }
export function MyCoursesPage() { return <LegacyPage title="My Courses" />; }
export function CourseLearningPage() { return <LegacyPage title="Course Learning" />; }
export function ModuleQuizPage() { return <LegacyPage title="Module Quiz" />; }
export function FinalAssessmentPage() { return <LegacyPage title="Final Assessment" />; }
export function CertificatePage() { return <LegacyPage title="Certificate" />; }
export function NotificationsPage() { return <LegacyPage title="Notifications" />; }
