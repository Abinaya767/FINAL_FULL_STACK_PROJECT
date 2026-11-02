import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header>
      <nav aria-label="Main navigation">
        <h2><Link to="/">LearnSpace</Link></h2>
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/courses">Courses</Link></li>
          <li><a href="#about">About Us</a></li>
          <li><a href="#contact">Contact Us</a></li>
        </ul>
        <div>
          <Link to="/login">Login</Link>
          <Link to="/register">Sign Up</Link>
        </div>
      </nav>
    </header>
  );
}
