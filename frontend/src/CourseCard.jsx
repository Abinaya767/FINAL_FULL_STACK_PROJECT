import React from "react";
import { Link } from "react-router-dom";

export default function CourseCard({ title, description, to = "/courses" }) {
  return (
    <article className="course-card">
      <h3>{title}</h3>
      <p>{description}</p>
      <Link to={to}>View course</Link>
    </article>
  );
}
