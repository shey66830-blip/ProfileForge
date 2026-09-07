import React from "react";
import { useNavigate } from "react-router-dom";

export default function PremiumGate({ children, required = "premium", currentPlan = "free", feature = "" }) {
  const nav = useNavigate();
  const planLevels = { free: 0, premium: 1, pro: 2 };
  const hasAccess = (planLevels[currentPlan] || 0) >= (planLevels[required] || 1);

  if (hasAccess) return children;

  return (
    <div className="premium-gate-wrapper">
      <div className="premium-gate-blurred">
        {children}
      </div>
      <div className="premium-gate-overlay">
        <div className="premium-gate-card">
          <span className="premium-gate-icon">
            {required === "pro" ? "⚡" : "⭐"}
          </span>
          <h3>{required === "pro" ? "Pro Feature" : "Premium Feature"}</h3>
          {feature && <p className="muted">{feature}</p>}
          <p className="muted" style={{ fontSize: 13 }}>
            Upgrade to {required.charAt(0).toUpperCase() + required.slice(1)} to unlock this and more.
          </p>
          <button className="primary-btn" onClick={() => nav("/premium")}>
            {required === "pro" ? "Upgrade to Pro — ₹499/mo" : "Upgrade to Premium — ₹199/mo"}
          </button>
        </div>
      </div>
    </div>
  );
}
