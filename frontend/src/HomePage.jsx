import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Footer from "./Footer.jsx";
import Navbar from "./Navbar.jsx";

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
