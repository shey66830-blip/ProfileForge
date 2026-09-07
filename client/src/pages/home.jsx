import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ScrollAnimate from "../components/ScrollAnimate.jsx";
import useTilt from "../hooks/useTilt.js";

const FREE_FEATURES = [
  { icon: "📄", title: "Resume Builder", desc: "Build professional resumes with AI assistance, multiple templates, and PDF export.", link: "/builder/resume" },
  { icon: "📋", title: "CV Builder", desc: "Create detailed CVs for academic and professional applications.", link: "/builder/cv" },
  { icon: "🤖", title: "AI Editor", desc: "Polish, rewrite and optimize your documents with AI suggestions.", link: "/ai-editor" },
  { icon: "💼", title: "Job Search", desc: "AI-powered job matching from 4 sources with skill analysis.", link: "/jobs" },
  { icon: "📈", title: "Application Tracker", desc: "Track your job applications, interviews, and offers in one place.", link: "/applications" },
  { icon: "⚖️", title: "Resume vs Job Compare", desc: "Compare your resume against any job description to find skill gaps.", link: "/resume-job-analysis" },
  { icon: "💾", title: "Saved Jobs", desc: "Bookmark interesting jobs and review them later.", link: "/saved-jobs" },
  { icon: "📚", title: "Learning Hub", desc: "Browse courses and certifications to fill your skill gaps.", link: "/courses" },
];

const PREMIUM_FEATURES = [
  { icon: "📄", title: "Biodata Builder", desc: "Generate traditional biodata for matrimonial and personal profiles." },
  { icon: "🤝", title: "Matchmaking Engine", desc: "AI-based partner matching with compatibility scoring." },
  { icon: "🎯", title: "Career Intelligence", desc: "Salary predictions, career roadmap, skills gap analysis, and company recommendations." },
  { icon: "✨", title: "Priority AI Editing", desc: "Faster AI processing, longer documents, and advanced editing." },
];

const HOW_IT_WORKS = [
  { step: "1", icon: "📄", title: "Upload or Build", desc: "Upload your existing resume or build one from scratch using our AI-powered builder." },
  { step: "2", icon: "🤖", title: "AI Analyzes", desc: "Our AI extracts skills, calculates ATS score, and identifies your career profile." },
  { step: "3", icon: "💼", title: "Match & Apply", desc: "Get matched with jobs from 4 sources, track applications, and land your dream role." },
];

const FAQ_DATA = [
  { q: "Is ProfileForge really free?", a: "Yes! Resume builder, CV builder, job search, AI editor, and application tracker are all completely free. Premium adds biodata, matchmaking, and career intelligence." },
  { q: "How does AI job matching work?", a: "We extract skills from your resume, compare them against job descriptions from Remotive, Adzuna, JSearch, and Arbeitnow, then calculate a match score based on skills, education, and experience." },
  { q: "Can I export my resume as PDF?", a: "Yes! Every resume and CV you build can be exported as a clean, professional PDF with one click." },
  { q: "What premium features do I get?", a: "Premium (₹199/mo) unlocks biodata builder, matchmaking engine, career intelligence dashboard, salary predictions, and priority AI editing. Pro (₹499/mo) adds unlimited exports and batch processing." },
  { q: "Is my data secure?", a: "Absolutely. Your documents are stored securely in our database, passwords are hashed, and we never share your data with third parties." },
];

function FeatureCard({ icon, title, desc, badge, onClick }) {
  const tilt = useTilt(6);
  return (
    <div className="feature-card card" ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave} onClick={onClick} style={{ cursor: "pointer" }}>
      <div className="feature-card-top">
        <span className="feature-icon">{icon}</span>
        <span className={"feature-badge " + (badge === "Free" ? "feature-badge-free" : "feature-badge-premium")}>{badge}</span>
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item" onClick={() => setOpen(!open)}>
      <div className="faq-question">
        <span>{q}</span>
        <span className="faq-arrow" style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
      </div>
      {open && <div className="faq-answer"><p>{a}</p></div>}
    </div>
  );
}

export default function Home({ user, openBuilder }) {
  const navigate = useNavigate();
  const handleFeatureClick = (f, isPremium) => {
    if (!user) return navigate("/auth");
    if (isPremium) return navigate("/premium");
    if (f.link) navigate(f.link);
  };

  return (
    <main className="landing-page">
      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-left">
          <p className="eyebrow">AI Career + Profile Platform</p>
          <h1 className="hero-heading">Build. Match. <span className="gradient-text">Land.</span></h1>
          <p className="hero-subtitle">Build professional resumes, get AI-matched jobs, track applications, and upskill with recommended courses — all in one platform.</p>
          <div className="hero-actions">
            {!user ? (
              <button className="primary-btn" onClick={() => navigate("/auth")}>Get Started — It's Free</button>
            ) : (
              <><button className="primary-btn" onClick={() => openBuilder("resume")}>Create Resume</button><button className="ghost-btn" onClick={() => navigate("/jobs")}>Search Jobs</button></>
            )}
          </div>
          <div className="hero-stats">
            <div><strong>8+</strong><span>Free Features</span></div>
            <div><strong>4</strong><span>Job Sources</span></div>
            <div><strong>AI</strong><span>Powered</span></div>
          </div>
        </div>
        <div className="hero-preview card">
          <div className="preview-top"><span /><span /><span /></div>
          <div className="preview-content">
            <p className="eyebrow">Live workspace</p>
            <h2>ProfileForge AI</h2>
            <div className="preview-row"><span>📄 Resume Builder</span><b className="free-tag">Free</b></div>
            <div className="preview-row"><span>💼 Job Search</span><b className="free-tag">Free</b></div>
            <div className="preview-row"><span>🤖 AI Editor</span><b className="free-tag">Free</b></div>
            <div className="preview-row"><span>📚 Learning Hub</span><b className="free-tag">Free</b></div>
            <div className="preview-row premium"><span>🎯 Career Intelligence</span><b className="premium-tag">Premium</b></div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <ScrollAnimate><section className="how-it-works">
        <p className="eyebrow">How It Works</p>
        <h2 className="section-title">3 steps to your dream job</h2>
        <div className="hiw-grid">
          {HOW_IT_WORKS.map((h, i) => (
            <div key={i} className="hiw-card">
              <div className="hiw-step">{h.step}</div>
              <span className="hiw-icon">{h.icon}</span>
              <h3>{h.title}</h3>
              <p>{h.desc}</p>
            </div>
          ))}
        </div>
      </section></ScrollAnimate>

      {/* Free Features */}
      <ScrollAnimate><section className="features-section">
        <p className="eyebrow">What you get for free</p>
        <h2 className="section-title">Everything you need — no credit card required</h2>
        <p className="section-subtitle">All these features are completely free. Sign up and start building.</p>
        <div className="grid three features-grid">
          {FREE_FEATURES.map((f, i) => (
            <FeatureCard key={i} icon={f.icon} title={f.title} desc={f.desc} badge="Free" onClick={() => handleFeatureClick(f, false)} />
          ))}
        </div>
      </section></ScrollAnimate>

      {/* Premium Features */}
      <ScrollAnimate><section className="features-section">
        <p className="eyebrow">Premium features</p>
        <h2 className="section-title">Unlock the full experience</h2>
        <p className="section-subtitle">Premium adds biodata, matchmaking, career intelligence and exclusive templates.</p>
        <div className="grid four features-grid">
          {PREMIUM_FEATURES.map((f, i) => (
            <FeatureCard key={i} icon={f.icon} title={f.title} desc={f.desc} badge="Premium" onClick={() => handleFeatureClick(f, true)} />
          ))}
        </div>
      </section></ScrollAnimate>

      {/* FAQ */}
      <ScrollAnimate><section className="faq-section">
        <p className="eyebrow">FAQ</p>
        <h2 className="section-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          {FAQ_DATA.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </section></ScrollAnimate>

      {/* CTA */}
      <ScrollAnimate><section className="cta card">
        <div>
          <p className="eyebrow">Start building</p>
          <h2>Your professional profile deserves a better workspace.</h2>
          <p>{!user ? "Join ProfileForge and start building your career today." : "Choose what you want to build next."}</p>
        </div>
        {!user ? (
          <button className="primary-btn" onClick={() => navigate("/auth")}>Get Started Free</button>
        ) : (
          <div className="row">
            <button className="primary-btn" onClick={() => openBuilder("resume")}>Create Resume</button>
            <button className="ghost-btn" onClick={() => navigate("/jobs")}>Search Jobs</button>
          </div>
        )}
      </section></ScrollAnimate>
    </main>
  );
}
