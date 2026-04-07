import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

function Navbar({ isLoggedIn, setIsLoggedIn }) {

  const logout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  return (
    <nav className="navbar">
      <h2>Burnout Predictor 🚀</h2>

      <div>
        {!isLoggedIn && <Link to="/">Login</Link>}
        {!isLoggedIn && <Link to="/register">Register</Link>}

        {isLoggedIn && <Link to="/dashboard">Dashboard</Link>}
        {isLoggedIn && <Link to="/predict">Predict</Link>}
        {isLoggedIn && <Link to="/flowchart">System Flow</Link>}  {/* added */}
        {isLoggedIn && <button onClick={logout}>Logout</button>}
      </div>
    </nav>
  );
}

export default Navbar;