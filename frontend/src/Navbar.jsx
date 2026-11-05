import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();

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
          {user ? (
            <>
              <span>{user.name}</span>
              <button type="button" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Sign Up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
