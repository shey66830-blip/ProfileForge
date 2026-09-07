import React, { useState } from "react";

import {
  loginUser,
  signupUser,
  validatePassword,
  startOAuth,
} from "../services/authService.js";

export default function Auth({ setUser }) {
  // After login/signup, GuestRoute (App.jsx) redirects back to the originally
  // requested route via location.state.from — or home when there is none.
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const update = (field, value) => {
    setForm({ ...form, [field]: value });
    setError("");
  };

  const validateSignup = () => {
    if (!form.name.trim()) return "Full name is required.";
    if (!form.username.trim()) return "Username is required.";
    if (form.username.length < 4)
      return "Username must be at least 4 characters.";
    if (!form.email.trim()) return "Email is required.";
    if (!form.email.includes("@")) return "Enter a valid email.";
    if (!form.password) return "Password is required.";

    const passwordError = validatePassword(form.password);
    if (passwordError) return passwordError;

    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }

    return "";
  };

  const handleSignup = async () => {
    const validationError = validateSignup();

    if (validationError) {
      setError(validationError);
      return;
    }

    const result = await signupUser({
      name: form.name,
      username: form.username,
      email: form.email,
      password: form.password,
    });

    if (!result.ok) {
      setError(result.message || "Signup failed.");
      return;
    }

    setUser(result.user);
    // GuestRoute in App.jsx owns the redirect: once `user` is set, it sends
    // the user back to the originally requested route (or home).
  };

  const handleLogin = async () => {
    if (!form.email.trim() || !form.password) {
      setError("Email and password are required.");
      return;
    }

    const result = await loginUser(form.email, form.password);

    if (!result.ok) {
      setError(result.message || "Login failed.");
      return;
    }

    setUser(result.user);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "login") {
      handleLogin();
    } else {
      handleSignup();
    }
  };

  return (
    <main className="container">
      <section className="auth-layout">
        <div className="auth-info card">
          <h1>Welcome to ProfileForge AI</h1>
          <p>Create resumes, CVs, and more with AI.</p>
        </div>

        <form className="auth-card card" onSubmit={handleSubmit}>
          <h2>{mode === "login" ? "Login" : "Create Account"}</h2>

          {mode === "signup" && (
            <>
              <input
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />

              <input
                placeholder="Username"
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
              />
            </>
          )}

          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
          />

          {mode === "signup" && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
            />
          )}

          {error && <p className="error">{error}</p>}

          <button className="primary-btn" type="submit">
            {mode === "login" ? "Login" : "Sign Up"}
          </button>

          <p>
            {mode === "login" ? "New user?" : "Already have account?"}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setError("");
                setMode(mode === "login" ? "signup" : "login");
              }}
            >
              {mode === "login" ? " Sign up" : " Login"}
            </button>
          </p>

          <div className="oauth-buttons">
            <button
              type="button"
              className="oauth-btn"
              onClick={() => startOAuth("google")}
            >
              <span className="oauth-logo google-logo">G</span>
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              className="oauth-btn"
              onClick={() => startOAuth("github")}
            >
              <span className="oauth-logo github-logo">GH</span>
              <span>Continue with GitHub</span>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}