import React, { useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";

function Login({ setIsLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const login = async () => {
    const res = await fetch("http://13.61.19.170:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    console.log(data);
    
    if (data.token) {
      localStorage.setItem("token", data.token);
      setIsLoggedIn(true);
      navigate("/dashboard");
    } else {
      alert(data.message);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Welcome Back 🚀</h1>
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="primary-btn" onClick={login}>
          Login
        </button>
      </div>
    </div>
  );
}

export default Login;