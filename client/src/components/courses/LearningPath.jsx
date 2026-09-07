import React from "react";

export default function LearningPath({ path }) {
  if (!path || !path.steps?.length) return null;

  return (
    <div className="learning-path">
      <div className="learning-path-header">
        <h2>{path.title}</h2>
        <div className="learning-path-stats">
          <span>⏱ {path.estimatedWeeks} weeks estimated</span>
          <span>💰 Total: {path.totalCost > 0 ? (path.steps[0]?.currency === "USD" ? "$" : "\u20B9") + path.totalCost.toLocaleString() : "Free"}</span>
          <span>📚 {path.steps.length} steps</span>
        </div>
      </div>

      <div className="learning-path-timeline">
        {path.steps.map((step, i) => (
          <div key={i} className={`learning-path-step ${i === 0 ? "active" : ""}`}>
            <div className="learning-path-connector">
              <div className="learning-path-dot" />
              {i < path.steps.length - 1 && <div className="learning-path-line" />}
            </div>
            <div className="learning-path-content">
              <div className="learning-path-step-header">
                <span className={`learning-path-type ${step.type}`}>
                  {step.type === "course" ? "📚" : "📜"}
                </span>
                <div>
                  <h4 className="learning-path-step-title">{step.title}</h4>
                  <span className="learning-path-step-provider">{step.provider}</span>
                </div>
              </div>
              <div className="learning-path-step-meta">
                <span className="learning-path-skill">🎯 {step.skill}</span>
                <span>⏱ {step.duration}</span>
                {step.price > 0 ? (
                  <span>{step.currency === "USD" ? "$" : "\u20B9"}{step.price.toLocaleString()}</span>
                ) : (
                  <span className="price-free">FREE</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {path.skillsCovered?.length > 0 && (
        <div className="learning-path-summary">
          <h4>Skills you'll gain:</h4>
          <div className="learning-path-skills">
            {path.skillsCovered.map((s, i) => <span key={i} className="skill-chip skill-matched">{s}</span>)}
          </div>
        </div>
      )}

      <button className="primary-btn" style={{ marginTop: 16, width: "100%" }}>
        Start Learning Journey
      </button>
    </div>
  );
}
