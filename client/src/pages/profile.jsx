import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";
import { API_BASE } from "../config.js";
import { AppContext } from "../App.jsx";

async function updateProfile(data) {
  try {
    const res = await fetch(API_BASE + "/auth/update-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch { return { ok: false, message: "Backend not reachable" }; }
}

async function getStats() {
  try {
    const [docs, apps, saved] = await Promise.all([
      fetch(API_BASE + "/documents", { credentials: "include" }).then(r => r.json()).catch(() => ({ documents: [] })),
      fetch(API_BASE + "/applications", { credentials: "include" }).then(r => r.json()).catch(() => ({ applications: [] })),
      fetch(API_BASE + "/saved-jobs", { credentials: "include" }).then(r => r.json()).catch(() => ({ jobs: [] })),
    ]);
    return {
      documents: (docs.documents || []).length,
      applications: (apps.applications || apps || []).length,
      savedJobs: (saved.jobs || []).length,
    };
  } catch { return { documents: 0, applications: 0, savedJobs: 0 }; }
}

export default function Profile({ user, setUser, setPage }) {
  const toast = useToast();
  const { isPremium, plan, premiumExpiry } = React.useContext(AppContext);
  const [stats, setStats] = useState({ documents: 0, applications: 0, savedJobs: 0 });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await updateProfile({ name, username });
    setSaving(false);
    if (res.ok) {
      setUser({ ...user, name: res.user.name, username: res.user.username });
      setEditing(false);
      toast.showToast("Profile updated successfully", "success");
    } else {
      toast.showToast(res.message || "Failed to update", "error");
    }
  }

  const planColors = { free: "#666", premium: "#6c5ce7", pro: "#f59e0b" };
  const planLabels = { free: "Free", premium: "Premium", pro: "Pro" };

  return (
    <main className="container">
      <section className="card">
        <p className="eyebrow">Your Profile</p>
        <h1>Account Settings</h1>
        <p className="muted">Manage your ProfileForge AI account, subscription, and preferences.</p>
      </section>

      {/* Stats Row */}
      <div className="profile-stats">
        <div className="profile-stat-card">
          <span className="profile-stat-icon">📄</span>
          <h2>{stats.documents}</h2>
          <p>Documents</p>
        </div>
        <div className="profile-stat-card">
          <span className="profile-stat-icon">💼</span>
          <h2>{stats.applications}</h2>
          <p>Applications</p>
        </div>
        <div className="profile-stat-card">
          <span className="profile-stat-icon">💾</span>
          <h2>{stats.savedJobs}</h2>
          <p>Saved Jobs</p>
        </div>
        <div className="profile-stat-card">
          <span className="profile-stat-icon">⭐</span>
          <h2 style={{ color: planColors[plan] }}>{planLabels[plan]}</h2>
          <p>Current Plan</p>
        </div>
      </div>

      {/* Profile Info */}
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <p className="eyebrow">Account Information</p>
            <h2>Personal Details</h2>
          </div>
          {!editing ? (
            <button className="ghost-btn" onClick={() => setEditing(true)}>Edit Profile</button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ghost-btn" onClick={() => { setEditing(false); setName(user?.name || ""); setUsername(user?.username || ""); }}>Cancel</button>
              <button className="primary-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </div>
          )}
        </div>

        <div className="profile-fields">
          <div className="profile-field">
            <label>Name</label>
            {editing ? (
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            ) : (
              <p>{user?.name || "Not set"}</p>
            )}
          </div>
          <div className="profile-field">
            <label>Username</label>
            {editing ? (
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" />
            ) : (
              <p>{user?.username || "Not set"}</p>
            )}
          </div>
          <div className="profile-field">
            <label>Email</label>
            <p>{user?.email || "Not set"}</p>
            <small className="muted">Email cannot be changed</small>
          </div>
        </div>
      </section>

      {/* Subscription */}
      <section className="card">
        <p className="eyebrow">Subscription</p>
        <h2>Current Plan</h2>
        <div className="profile-subscription">
          <div className="profile-plan-badge" style={{ background: planColors[plan] + "22", color: planColors[plan], borderColor: planColors[plan] }}>
            {planLabels[plan]} Plan
          </div>
          {isPremium && premiumExpiry && (
            <p className="muted">Expires: {new Date(premiumExpiry).toLocaleDateString()}</p>
          )}
          {!isPremium && (
            <Link to="/premium" className="primary-btn" style={{ textDecoration: "none" }}>Upgrade to Premium</Link>
          )}
          {isPremium && (
            <Link to="/subscription" className="ghost-btn" style={{ textDecoration: "none" }}>Manage Subscription</Link>
          )}
        </div>
      </section>

      {/* Quick Links */}
      <section className="card">
        <p className="eyebrow">Quick Links</p>
        <div className="profile-links">
          <Link to="/dashboard" className="profile-link">📄 My Documents</Link>
          <Link to="/jobs" className="profile-link">💼 Job Search</Link>
          <Link to="/courses" className="profile-link">📚 Learning Hub</Link>
          <Link to="/applications" className="profile-link">📋 Applications</Link>
          <Link to="/saved-jobs" className="profile-link">💾 Saved Jobs</Link>
          {isPremium && <Link to="/subscription" className="profile-link">⭐ Subscription</Link>}
        </div>
      </section>

    </main>
  );
}
