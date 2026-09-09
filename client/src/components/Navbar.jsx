import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/builder/resume", label: "Resume", action: "resume" },
  { path: "/builder/cv", label: "CV", action: "cv" },
  { path: "/profile-builder", label: "Profile" },
  { path: "/tailoring", label: "Tailor" },
  { path: "/ai-editor", label: "AI Edit" },
  { path: "/jobs", label: "Jobs" },
  { path: "/saved-jobs", label: "Saved" },
  { path: "/applications", label: "Apps" },
  { path: "/resume-job-analysis", label: "Compare" },
  { path: "/export-ats", label: "Export" },
  { path: "/courses", label: "Learn" },
];

const MOBILE_ICONS = {
  "/dashboard": "📊", "/builder/resume": "📄", "/builder/cv": "📋", "/profile-builder": "👤",
  "/tailoring": "✂️", "/ai-editor": "🤖", "/jobs": "💼", "/saved-jobs": "♡",
  "/applications": "📈", "/resume-job-analysis": "⚖️", "/export-ats": "📥", "/courses": "📚",
};

export default function Navbar({ openBuilder, user, logout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const plan = user?.plan || "free";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userDrop, setUserDrop] = useState(false);
  const sidebarRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setUserDrop(false); }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const h = (e) => { if (sidebarRef.current && !sidebarRef.current.contains(e.target)) setMobileOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [mobileOpen]);

  useEffect(() => {
    if (!userDrop) return;
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setUserDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [userDrop]);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") { setMobileOpen(false); setUserDrop(false); } };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const handleNav = useCallback((item) => {
    if (item.action && openBuilder) openBuilder(item.action);
    else navigate(item.path);
    setMobileOpen(false);
  }, [navigate, openBuilder]);

  const isActive = (path) => location.pathname === path;

  const initials = user ? (user.username || user.name || "U")[0].toUpperCase() : "";
  const userName = user ? (user.username || user.name || "User") : "";

  return (
    <>
      <nav className="navbar" data-scrolled={scrolled || undefined} aria-label="Main navigation">
        <div className="brand" onClick={() => navigate("/")} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/')} aria-label="ProfileForge home">
          <span className="brand-mark">PF</span>
          <span className="brand-name">ProfileForge</span>
        </div>

        <div className="nav-links-desktop">
          {user && NAV_ITEMS.map((item) => (
            <button key={item.path} className="nav-link" data-active={isActive(item.path) || undefined} onClick={() => handleNav(item)}>{item.label}</button>
          ))}
          {user && <button className="nav-link nav-premium" onClick={() => navigate("/premium")}>★ Premium</button>}
        </div>

        <div className="nav-right">
          <button className="nav-theme" onClick={toggleTheme} title="Toggle theme" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === "dark" ? "☾" : "☀"}</button>
          {user ? (
            <div className="nav-user" ref={dropRef}>
              <button className="nav-avatar" onClick={() => setUserDrop(!userDrop)} aria-expanded={userDrop} aria-haspopup="true" aria-label="User menu">{initials}{plan === "pro" && <span className="plan-badge plan-pro">PRO</span>}{plan === "premium" && <span className="plan-badge plan-premium">PREM</span>}<svg className="nav-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              {userDrop && (
                <div className="nav-dropdown">
                  <button onClick={() => { navigate("/profile"); setUserDrop(false); }}>👤 Profile</button>
                  <button onClick={() => { navigate("/premium"); setUserDrop(false); }}>★ Premium</button>
                  <div className="dropdown-sep" />
                  <button className="dropdown-danger" onClick={() => { setUserDrop(false); logout(); }}>🚪 Logout</button>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-login" onClick={() => navigate("/auth")}>Login</button>
          )}
        </div>
      </nav>

      <div className="nav-mobile">
        <button className="nav-theme" onClick={toggleTheme}>{theme === "dark" ? "☾" : "☀"}</button>
        <button className="nav-hamburger" onClick={() => setMobileOpen(!mobileOpen)} data-open={mobileOpen || undefined} aria-expanded={mobileOpen} aria-label="Toggle navigation menu"><span /><span /><span /></button>
      </div>

      {mobileOpen && <div className="nav-overlay" onClick={() => setMobileOpen(false)} />}
      <div className="nav-sidebar" data-open={mobileOpen || undefined} ref={sidebarRef} role="dialog" aria-label="Navigation menu" aria-modal={mobileOpen}>
        <div className="sidebar-head"><span className="brand-mark">PF</span><span className="brand-name">ProfileForge</span></div>
        <div className="sidebar-links">
          {NAV_ITEMS.map((item) => (
            <button key={item.path} className={"sidebar-link" + (isActive(item.path) ? " active" : "")} onClick={() => handleNav(item)}>
              <span>{MOBILE_ICONS[item.path] || ""}</span> {item.label}
            </button>
          ))}
          <button className="sidebar-link" onClick={() => { navigate("/premium"); setMobileOpen(false); }}><span>★</span> Premium</button>
        </div>
        <div className="sidebar-foot">
          {user ? (<><div className="sidebar-user"><span className="nav-avatar">{initials}</span><span>{userName}</span></div><button className="sidebar-link" onClick={() => { setMobileOpen(false); logout(); }}>🚪 Logout</button></>) : (<button className="nav-login" style={{width:"100%"}} onClick={() => { navigate("/auth"); setMobileOpen(false); }}>Login</button>)}
        </div>
      </div>
    </>
  );
}