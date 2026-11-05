import React from "react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  useEffect(() => {
    document.title = "Page Not Found | LearnSpace";
  }, []);

  return (
    <main className="not-found-page">
      <section>
        <h1>Page Not Found</h1>
        <p>The LearnSpace page you requested does not exist.</p>
        <Link to="/">Return to LearnSpace Home</Link>
      </section>
    </main>
  );
}
