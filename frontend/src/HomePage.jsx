import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Footer from "../components/Footer.jsx";
import Navbar from "../components/Navbar.jsx";

export default function HomePage() {
  const location = useLocation();

  useEffect(() => {
    document.title = "LearnSpace - Online Learning Platform";
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.hash]);

  return (
    <div className="react-home">
      <Navbar />
      <main>
        <section id="home">
          <h1>Make Room to Grow.</h1>
          <p>Discover new skills, explore your interests, and take the next step towards your future.</p>
          <Link to="/login">Discover LearnSpace</Link>
          <div>
            <h3>YOUR LEARNING JOURNEY</h3>
            <h2>Dream. Learn. Achieve.</h2>
            <p>Every new skill brings you closer to your goals.</p>
            <h3>Your Next Lesson</h3>
            <p>Learn something new today.</p>
            <h3>Keep Moving Forward ✨</h3>
          </div>
        </section>

        <section id="sample-certificate" aria-labelledby="sample-certificate-heading">
          <h2 id="sample-certificate-heading">See What You'll Earn</h2>
          <p>This certificate preview is a sample only. It does not represent a real student or completed course.</p>
          <article className="sample-certificate-card certificate-artwork">
            <p className="sample-certificate-watermark" aria-hidden="true">SAMPLE</p>
            <p className="sample-certificate-brand">LearnSpace</p>
            <h3>Certificate of Completion</h3>
            <p className="sample-certificate-intro">This sample certificate is presented to</p>
            <p className="sample-certificate-student">Sample Student</p>
            <p>for completing the sample course</p>
            <p className="sample-certificate-course">Introduction to Web Development</p>
            <p className="sample-certificate-date">Sample completion date: November 2, 2026</p>
          </article>
          <p className="sample-certificate-link"><Link to="/certificate">View Certificate</Link></p>
        </section>

        <section id="about">
          <h2>About LearnSpace</h2>
          <p>
            LearnSpace is an online learning platform designed to help students
            learn new skills and improve their knowledge through structured courses.
          </p>
          <p>
            Students can explore courses, enroll in their preferred courses,
            access learning modules, complete quizzes and assessments, track
            their learning progress, and earn certificates after successful completion.
          </p>
        </section>

        <section id="contact">
          <h2>Contact Us</h2>
          <p>Have questions or need assistance? Get in touch with the LearnSpace team.</p>
          <p>Email: support@learnspace.com</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
