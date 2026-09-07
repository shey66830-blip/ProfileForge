import React from "react";
import { Link } from "react-router-dom";

const FLAG_MAP = {
  India: "🇮🇳", USA: "🇺🇸", "United States": "🇺🇸", Canada: "🇨🇦",
  Germany: "🇩🇪", UK: "🇬🇧", "United Kingdom": "🇬🇧", Australia: "🇦🇺",
  Singapore: "🇸🇬", UAE: "🇦🇪", Japan: "🇯🇵", France: "🇫🇷",
};
const LEVEL_COLORS = { Fresher: "#22c55e", Beginner: "#3b82f6", Experienced: "#a855f7" };

function formatSalary(amount, currency) {
  if (!amount) return "N/A";
  const sym = currency === "USD" ? "$" : "₹";
  if (amount >= 100000) return sym + (amount / 100000).toFixed(1) + "L";
  if (amount >= 1000) return sym + (amount / 1000).toFixed(0) + "K";
  return sym + amount;
}

function QuickStats({ jobs }) {
  const total = jobs.length;
  const avgMatch = total > 0 ? Math.round(jobs.reduce((s, j) => s + (j.match?.overall || 0), 0) / total) : 0;
  const strong = jobs.filter(j => (j.match?.overall || 0) >= 70).length;
  const allMissing = new Set();
  jobs.forEach(j => (j.match?.missingSkills || []).forEach(s => allMissing.add(s)));
  return (
    <div className="ci-quick-stats">
      <div className="ci-stat-card"><span className="ci-stat-icon">📊</span><h2>{total}</h2><p>Jobs Analyzed</p></div>
      <div className="ci-stat-card"><span className="ci-stat-icon">🎯</span><h2>{avgMatch}%</h2><p>Average Match</p></div>
      <div className="ci-stat-card"><span className="ci-stat-icon">💪</span><h2>{strong}</h2><p>Strong Matches</p></div>
      <div className="ci-stat-card"><span className="ci-stat-icon">📚</span><h2>{allMissing.size}</h2><p>Skills to Learn</p></div>
    </div>
  );
}

function CareerLevel({ careerAdvice, rec }) {
  const level = careerAdvice.currentLevel || "Fresher";
  const color = LEVEL_COLORS[level] || "#3b82f6";
  return (
    <div className="ci-section">
      <h3 className="ci-section-title">🎯 Career Level</h3>
      <div className="ci-career-level">
        <div className="ci-level-badge" style={{ borderColor: color, color }}>{level}</div>
        <p className="ci-career-domain">{careerAdvice.primaryCareer || "General"}</p>
        {rec.careerAdvice && <p className="ci-advice-text">💡 {rec.careerAdvice}</p>}
        {careerAdvice.recommendedSkills?.length > 0 && (
          <div className="ci-skills-chips">
            <span className="ci-skills-label">Key Skills to Master:</span>
            {careerAdvice.recommendedSkills.map((s, i) => (
              <span key={i} className="ci-chip ci-chip-blue">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SalaryIntelligence({ salaryPred, careerAdvice }) {
  if (!salaryPred.average) return null;
  const growth = careerAdvice.estimatedSalaryGrowth || {};
  const growthItems = [
    { label: "Now", value: growth.current, pct: 0 },
    { label: "1 Year", value: growth.afterOneYear, pct: growth.current ? Math.round(((growth.afterOneYear - growth.current) / growth.current) * 100) : 0 },
    { label: "3 Years", value: growth.afterThreeYears, pct: growth.current ? Math.round(((growth.afterThreeYears - growth.current) / growth.current) * 100) : 0 },
    { label: "5 Years", value: growth.afterFiveYears, pct: growth.current ? Math.round(((growth.afterFiveYears - growth.current) / growth.current) * 100) : 0 },
  ].filter(g => g.value);
  return (
    <div className="ci-section">
      <h3 className="ci-section-title">💰 Salary Intelligence</h3>
      <div className="ci-salary">
        <div className="ci-salary-main">
          <span className="ci-salary-amount">{formatSalary(salaryPred.average, salaryPred.currency)}</span>
          <span className="ci-salary-label">Estimated Annual Salary</span>
        </div>
        <div className="ci-salary-range">
          <div className="ci-range-bar">
            <div className="ci-range-fill" style={{ left: "0%", width: "100%" }} />
            <div className="ci-range-marker ci-range-min" style={{ left: "0%" }}>
              <span>{formatSalary(salaryPred.minimum, salaryPred.currency)}</span><small>Min</small>
            </div>
            <div className="ci-range-marker ci-range-avg" style={{ left: "50%" }}>
              <span>{formatSalary(salaryPred.average, salaryPred.currency)}</span><small>Avg</small>
            </div>
            <div className="ci-range-marker ci-range-max" style={{ left: "100%" }}>
              <span>{formatSalary(salaryPred.maximum, salaryPred.currency)}</span><small>Max</small>
            </div>
          </div>
        </div>
        <div className="ci-confidence">
          <span>Confidence: {salaryPred.confidence || 0}%</span>
          <div className="ci-confidence-bar"><div className="ci-confidence-fill" style={{ width: (salaryPred.confidence || 0) + "%" }} /></div>
        </div>
        {salaryPred.reason && <p className="ci-salary-reason">{salaryPred.reason}</p>}
      </div>
      {growthItems.length > 0 && (
        <div className="ci-growth-timeline">
          <h4>📈 Salary Growth Projection</h4>
          {growthItems.map((g, i) => (
            <div key={i} className="ci-growth-item">
              <div className="ci-growth-dot" />
              {i < growthItems.length - 1 && <div className="ci-growth-line" />}
              <div className="ci-growth-content">
                <span className="ci-growth-label">{g.label}</span>
                <span className="ci-growth-value">{formatSalary(g.value, salaryPred.currency)}</span>
                {g.pct > 0 && <span className="ci-growth-pct">+{g.pct}%</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CareerRoadmap({ roadmap }) {
  if (!roadmap) return null;
  const milestones = [
    { time: "3 Months", items: roadmap.threeMonths, color: "#22c55e" },
    { time: "6 Months", items: roadmap.sixMonths, color: "#3b82f6" },
    { time: "1 Year", items: roadmap.oneYear, color: "#a855f7" },
    { time: "3 Years", items: roadmap.threeYears, color: "#f59e0b" },
    { time: "5 Years", items: roadmap.fiveYears, color: "linear-gradient(135deg, #6c5ce7, #ec4899)" },
  ].filter(m => m.items?.length > 0);
  if (milestones.length === 0) return null;
  return (
    <div className="ci-section">
      <h3 className="ci-section-title">🗺️ Career Roadmap</h3>
      <div className="ci-roadmap">
        {milestones.map((m, i) => (
          <div key={i} className="ci-roadmap-item">
            <div className="ci-roadmap-dot" style={{ background: m.color }} />
            {i < milestones.length - 1 && <div className="ci-roadmap-line" />}
            <div className="ci-roadmap-card">
              <span className="ci-roadmap-time">{m.time}</span>
              <ul>{m.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillsGap({ topJob }) {
  const matched = topJob?.match?.matchedSkills || [];
  const missing = topJob?.match?.missingSkills || [];
  const total = matched.length + missing.length;
  const pct = total > 0 ? Math.round((matched.length / total) * 100) : 0;
  return (
    <div className="ci-section">
      <h3 className="ci-section-title">🔍 Skills Gap Analysis</h3>
      <div className="ci-skills-gap">
        <div className="ci-skills-col">
          <h4>✅ Your Skills ({matched.length})</h4>
          <div className="ci-chips-wrap">
            {matched.length > 0 ? matched.map((s, i) => (
              <span key={i} className="ci-chip ci-chip-green">{s}</span>
            )) : <p className="muted">No matched skills detected</p>}
          </div>
        </div>
        <div className="ci-skills-col">
          <h4>📈 Skills to Learn ({missing.length})</h4>
          <div className="ci-chips-wrap">
            {missing.length > 0 ? missing.map((s, i) => (
              <span key={i} className="ci-chip ci-chip-orange">{s}</span>
            )) : <p className="muted">No gaps identified</p>}
          </div>
        </div>
      </div>
      <div className="ci-match-bar">
        <div className="ci-match-fill" style={{ width: pct + "%" }} />
        <span className="ci-match-label">{pct}% skill match</span>
      </div>
    </div>
  );
}

function CompaniesAndCerts({ careerAdvice, rec }) {
  const companies = careerAdvice.targetCompanies || rec.suggestedCompanies || [];
  const certs = careerAdvice.certifications || rec.suggestedCertifications || [];
  return (
    <div className="ci-section">
      <h3 className="ci-section-title">🏢 Target Companies & Certifications</h3>
      <div className="ci-grid-two">
        <div>
          <h4>Target Companies</h4>
          <div className="ci-companies-grid">
            {companies.length > 0 ? companies.map((c, i) => (
              <div key={i} className="ci-company-card">
                <span className="ci-company-avatar">{c.charAt(0)}</span>
                <span>{c}</span>
              </div>
            )) : <p className="muted">No company recommendations yet</p>}
          </div>
        </div>
        <div>
          <h4>Recommended Certifications</h4>
          <div className="ci-certs-grid">
            {certs.length > 0 ? certs.map((c, i) => (
              <Link key={i} to="/courses" className="ci-cert-card">
                <span className="ci-cert-icon">🎓</span>
                <span>{c}</span>
              </Link>
            )) : <p className="muted">No certifications suggested</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobalOpportunities({ rec }) {
  const countries = rec.suggestedCountries || [];
  if (countries.length === 0) return null;
  const tiers = ["Top Market", "Strong", "Emerging"];
  return (
    <div className="ci-section">
      <h3 className="ci-section-title">🌍 Global Opportunities</h3>
      <div className="ci-countries-grid">
        {countries.map((c, i) => (
          <div key={i} className="ci-country-card">
            <span className="ci-country-flag">{FLAG_MAP[c] || "🌐"}</span>
            <span className="ci-country-name">{c}</span>
            <span className="ci-country-tier">{tiers[i] || "Opportunity"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiSuggestions({ rec }) {
  const suggestions = rec.recommendations || [];
  const warnings = rec.warnings || [];
  const improvements = rec.improvements || [];
  if (suggestions.length === 0 && warnings.length === 0 && improvements.length === 0) return null;
  return (
    <div className="ci-section">
      <h3 className="ci-section-title">🤖 AI Career Advice</h3>
      <div className="ci-grid-two">
        {suggestions.length > 0 && (
          <div className="ci-suggestions-card">
            <h4>💡 Suggestions</h4>
            <ol>{suggestions.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="ci-warnings-card">
            <h4>⚠️ Warnings</h4>
            <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        )}
      </div>
      {improvements.length > 0 && (
        <div className="ci-improvements-card">
          <h4>📈 Action Items</h4>
          <ul>{improvements.map((imp, i) => <li key={i}>{imp}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function PremiumGate() {
  return (
    <div className="ci-premium-gate">
      <div className="ci-gate-preview">
        <div className="ci-gate-grid">
          {[{ icon: "🗺️", title: "Career Roadmap", desc: "5-year personalized growth plan" },
            { icon: "💰", title: "Salary Prediction", desc: "AI-estimated salary with growth timeline" },
            { icon: "🔍", title: "Skills Gap Analysis", desc: "What you have vs what you need" },
            { icon: "🏢", title: "Target Companies", desc: "Companies that match your profile" },
            { icon: "🌍", title: "Global Opportunities", desc: "Best countries for your career" },
            { icon: "🤖", title: "AI Career Advice", desc: "Personalized suggestions & warnings" },
          ].map((f, i) => (
            <div key={i} className="ci-gate-card">
              <span className="ci-gate-icon">{f.icon}</span>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="ci-gate-overlay">
        <div className="ci-gate-content">
          <span className="ci-gate-lock">🔒</span>
          <h2>Unlock Career Intelligence</h2>
          <p>Get AI-powered career guidance, salary predictions, skills roadmap, and company recommendations.</p>
          <span className="ci-gate-price">₹199/mo</span>
          <Link to="/premium" className="primary-btn ci-gate-btn">Upgrade to Premium</Link>
          <span className="ci-gate-trust">Cancel anytime · Instant access · 7-day refund</span>
        </div>
      </div>
    </div>
  );
}

export default function PremiumAdvice({ unlocked = false, jobs = [] }) {
  const sorted = [...jobs].sort((a, b) => (b.match?.overall || 0) - (a.match?.overall || 0));
  const topJob = sorted[0] || null;
  const careerAdvice = topJob?.careerAdvice || {};
  const salaryPred = topJob?.salaryPrediction || {};
  const rec = topJob?.recommendation || {};

  if (jobs.length === 0) {
    return (
      <section className="card ci-dashboard">
        <p className="eyebrow">AI Premium Career Advisor</p>
        <h2>Personalized Career Intelligence</h2>
        <div className="ci-empty-state">
          <span className="ci-empty-icon">🔍</span>
          <h3>No Data Yet</h3>
          <p>Search for jobs first to see your personalized career intelligence dashboard with salary predictions, career roadmap, and skills gap analysis.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card ci-dashboard">
      <p className="eyebrow">AI Premium Career Advisor</p>
      <h2>Personalized Career Intelligence</h2>
      {!unlocked ? (
        <PremiumGate />
      ) : (
        <div className="ci-content">
          <QuickStats jobs={jobs} />
          <CareerLevel careerAdvice={careerAdvice} rec={rec} />
          <SalaryIntelligence salaryPred={salaryPred} careerAdvice={careerAdvice} />
          <CareerRoadmap roadmap={careerAdvice.roadmap} />
          <SkillsGap topJob={topJob} />
          <CompaniesAndCerts careerAdvice={careerAdvice} rec={rec} />
          <GlobalOpportunities rec={rec} />
          <AiSuggestions rec={rec} />
        </div>
      )}
    </section>
  );
}
