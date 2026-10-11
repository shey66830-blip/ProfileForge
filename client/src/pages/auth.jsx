import React, { useState } from "react";

import { loginUser, signupUser, validatePassword, startOAuth } from "../services/authService.js";

// Spark-style split auth: left = pitch + form, right = tall product visual
// with floating status cards. Form logic unchanged; GuestRoute in App.jsx
// still owns the post-auth redirect.
export default function Auth({ setUser }) {
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
    if (form.username.length < 4) return "Username must be at least 4 characters.";
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
    <main className="auth-page">
      <section className="auth-layout" aria-label="Sign in or create an account">
        {/* ── Left: pitch + form ── */}
        <div className="auth-left">
          <span className="auth-chip">
            <span className="auth-chip-icon" aria-hidden="true">
              ▣
            </span>
            Resumes, CVs &amp; biodatas — one workspace
            <span aria-hidden="true" className="auth-chip-arrow">
              ↗
            </span>
          </span>

          <h1 className="auth-headline">
            {mode === "login" ? (
              <>
                Welcome back.
                <br />
                <span className="gradient-text">Land the next one.</span>
              </>
            ) : (
              <>
                Build. Match. <span className="gradient-text">Land.</span>
              </>
            )}
          </h1>

          <p className="auth-sub">
            {mode === "login"
              ? "Your resumes, job matches, and applications — right where you left them."
              : "Create your account free. No card needed. Everything you build stays yours."}
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {mode === "signup" && (
              <div className="auth-row">
                <input
                  aria-label="Full name"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
                <input
                  aria-label="Username"
                  placeholder="Username"
                  value={form.username}
                  onChange={(e) => update("username", e.target.value)}
                />
              </div>
            )}

            <div className="auth-row">
              <input
                aria-label="Email"
                type="email"
                placeholder={mode === "login" ? "Your email goes here" : "Email"}
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
              {mode === "login" && (
                <button className="auth-start-btn" type="submit">
                  Sign in <span aria-hidden="true">↗</span>
                </button>
              )}
            </div>

            <input
              aria-label="Password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />

            {mode === "signup" && (
              <>
                <input
                  aria-label="Confirm password"
                  type="password"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                />
                <button className="auth-start-btn auth-start-btn-wide" type="submit">
                  Create account <span aria-hidden="true">↗</span>
                </button>
              </>
            )}

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </form>

          <p className="auth-hint">
            {mode === "login" ? "No account yet? It takes 20 seconds." : "Already have an account?"}{" "}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setError("");
                setMode(mode === "login" ? "signup" : "login");
              }}
            >
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </p>

          <div className="auth-divider" role="separator" aria-label="or continue with">
            <span>or continue with</span>
          </div>

          <div className="oauth-buttons">
            <button type="button" className="oauth-btn" onClick={() => startOAuth("google")}>
              <span className="oauth-logo google-logo">G</span>
              <span>Google</span>
            </button>

            <button type="button" className="oauth-btn" onClick={() => startOAuth("github")}>
              <span className="oauth-logo github-logo">GH</span>
              <span>GitHub</span>
            </button>
          </div>
        </div>

        {/* ── Right: tall visual panel with a real product preview ── */}
        <div className="auth-visual" aria-hidden="true">
          <div className="auth-visual-inner">
            <div className="auth-visual-tags">
              <span className="auth-tag">ProfileForge / AI career platform</span>
              <span className="auth-tag">AI-powered</span>
            </div>

            <p className="auth-visual-quote">
              Everything you need
              <br />
              to land the job.
            </p>

            <div className="auth-workspace">
              <span className="auth-ws-eyebrow">Live workspace</span>
              <strong className="auth-ws-title">ProfileForge AI</strong>
              <div className="auth-ws-rows">
                <div className="auth-ws-row">
                  <span className="auth-ws-icon">📄</span> Resume Builder
                </div>
                <div className="auth-ws-row">
                  <span className="auth-ws-icon">💼</span> Job Search — 7 sources
                </div>
                <div className="auth-ws-row">
                  <span className="auth-ws-icon">🤖</span> AI Editor &amp; Tailoring
                </div>
                <div className="auth-ws-row">
                  <span className="auth-ws-icon">⚖️</span> Resume ↔ Job Compare
                </div>
                <div className="auth-ws-row">
                  <span className="auth-ws-icon">📥</span> ATS-safe Export
                </div>
              </div>
            </div>

            <div className="auth-visual-foot">
              <span className="auth-stat-badge">
                <strong>8+</strong> free features
              </span>
              <span className="auth-stat-badge">
                <strong>279</strong> tests green
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
