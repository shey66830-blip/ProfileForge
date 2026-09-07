import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startPremiumCheckout, mockTestPayment } from "../services/paymentService.js";
import { AppContext } from "../App.jsx";
import { useToast } from "../context/ToastContext.jsx";

const FEATURES=[
{name:"Resume Builder",free:true,premium:true,pro:true},
{name:"CV Builder",free:true,premium:true,pro:true},
{name:"PDF Export",free:"5/day",premium:"Unlimited",pro:"Unlimited"},
{name:"Job Search (4 sources)",free:true,premium:true,pro:true},
{name:"AI Resume Match",free:true,premium:true,pro:true},
{name:"Saved Jobs",free:true,premium:true,pro:true},
{name:"Application Tracker",free:true,premium:true,pro:true},
{name:"Resume vs Job Compare",free:true,premium:true,pro:true},
{name:"Biodata Builder",free:false,premium:true,pro:true},
{name:"Matchmaking Engine",free:false,premium:true,pro:true},
{name:"Premium Templates",free:false,premium:"5 templates",pro:"All templates"},
{name:"AI Editor",free:"3/day",premium:"50/day",pro:"Unlimited"},
{name:"AI Cover Letter",free:"2/day",premium:"20/day",pro:"Unlimited"},
{name:"Resume Tailoring",free:false,premium:"10/day",pro:"Unlimited"},
{name:"Learning Hub (AI Recs)",free:false,premium:true,pro:true},
{name:"Advanced Analytics",free:false,premium:false,pro:true},
{name:"Batch Resume Tailoring",free:false,premium:false,pro:true},
{name:"Priority AI Processing",free:false,premium:false,pro:true},
{name:"Priority Support",free:false,premium:false,pro:true},
{name:"Early Access Features",free:false,premium:false,pro:true},
];
const FAQ=[
{q:"Can I switch plans later?",a:"Yes! Upgrade anytime. New plan activates immediately."},
{q:"Is there a refund policy?",a:"7-day money-back guarantee. Contact us for a full refund."},
{q:"What payment methods?",a:"Credit/debit cards, UPI, net banking, wallets via Razorpay."},
{q:"Is my data safe?",a:"Industry-standard encryption. We never share your data."},
{q:"What happens when it expires?",a:"Free plan resumes. Your data is preserved - just re-upgrade."},
];

function FI({value}){if(value===true)return React.createElement("span",{className:"feat-check"},"✓");if(value===false)return React.createElement("span",{className:"feat-cross"},"✗");return React.createElement("span",{className:"feat-text"},value);}

export default function Premium({user}){const nav=useNavigate();const{plan,premiumExpiry,refreshPlan}=React.useContext(AppContext);const toast = useToast();
const[loading,setLoading]=useState(false);const[error,setError]=useState("");const[openFaq,setOpenFaq]=useState(-1);
async function handleUpgrade(sp){
  setLoading(true);
  setError("");
  let r;
  if(sp==="premium"&&user){
    try{
      r=await mockTestPayment("premium");
    }catch(e){
      r={ok:false,message:e.message||"mock failed"};
    }
  }else{
    r=await startPremiumCheckout(user,sp);
  }
  setLoading(false);
  if(r.ok){
    await refreshPlan();
    toast.showToast((sp==="pro" ? "Pro" : "Premium") + " activate ho gaya!");
  } else {
    setError(r.message || "Payment fail ho gaya.");
  }
}

return (
  <main className="premium-page">
    <section className="premium-hero"><div className="premium-hero-content">
      <p className="eyebrow">Unlock Your Full Potential</p>
      <h1 className="premium-hero-title">Choose the Plan That<br/>Fits Your Career Goals</h1>
      <p className="muted" style={{fontSize:16,maxWidth:500}}>From resume building to AI-powered career coaching.</p>
    </div></section>

    {plan!=="free"&&premiumExpiry&&(<section className="card active-sub-card"><div className="active-sub-content">
      <span className="active-sub-badge">{plan==="pro"?"⚡ PRO":"⭐ PREMIUM"} Active</span>
      <div><h3 style={{margin:"0 0 4px"}}>Your subscription is active</h3>
      <p className="muted" style={{margin:0}}>Valid until <strong>{new Date(premiumExpiry).toLocaleDateString()}</strong></p></div>
    </div><button className="ghost-btn small" onClick={()=>nav("/subscription")}>Manage</button></section>)}

    <section className="premium-pricing-grid">
      <div className="card pricing-card"><div className="pricing-header"><span className="pricing-tier">Free</span>
      <div className="pricing-amount"><span className="pricing-currency">₹</span>0</div><p className="muted">Get started with core tools</p></div>
      <ul className="pricing-features"><li>✓ Resume & CV Builder</li><li>✓ PDF Export (5/day)</li><li>✓ Job Search</li><li>✓ AI Resume Match</li><li>✓ Application Tracker</li></ul>
      <button className="ghost-btn" style={{width:"100%"}} disabled={plan==="free"}>{plan==="free"?"Current Plan":"Downgrade"}</button></div>

      <div className="card pricing-card featured-plan"><div className="pricing-popular">Most Popular</div>
      <div className="pricing-header"><span className="pricing-tier">Premium</span>
      <div className="pricing-amount"><span className="pricing-currency">₹</span>199<span className="pricing-period">/mo</span></div><p className="muted">Everything for career growth</p></div>
      <ul className="pricing-features"><li>✓ Everything in Free</li><li>✓ Biodata Builder</li><li>✓ Matchmaking</li><li>✓ Premium Templates</li><li>✓ AI Editor (50/day)</li><li>✓ Cover Letters (20/day)</li><li>✓ Resume Tailoring (10/day)</li><li>✓ Learning Hub Recs</li></ul>
      {plan==="premium"?<button className="primary-btn" style={{width:"100%"}} disabled>Current Plan ✓</button>:
      <button className="primary-btn" style={{width:"100%"}} onClick={()=>handleUpgrade("premium")} disabled={loading}>{loading?"Processing...":plan==="pro"?"Downgrade to Premium":"Upgrade to Premium"}</button>}</div>

      <div className="card pricing-card pro-plan"><div className="pricing-pro-badge">Best Value</div>
      <div className="pricing-header"><span className="pricing-tier">Pro</span>
      <div className="pricing-amount"><span className="pricing-currency">₹</span>499<span className="pricing-period">/mo</span></div><p className="muted">Unlimited power + priority</p></div>
      <ul className="pricing-features"><li>✓ Everything in Premium</li><li>✓ Unlimited AI</li><li>✓ All Templates</li><li>✓ Advanced Analytics</li><li>✓ Batch Tailoring</li><li>✓ Priority AI</li><li>✓ Priority Support</li><li>✓ Early Access</li></ul>
      {plan==="pro"?<button className="primary-btn" style={{width:"100%",background:"linear-gradient(135deg,#f59e0b,#ef4444)"}} disabled>Current Plan ✓</button>:
      <button className="primary-btn" style={{width:"100%",background:"linear-gradient(135deg,#f59e0b,#ef4444)"}} onClick={()=>handleUpgrade("pro")} disabled={loading}>{loading?"Processing...":"Upgrade to Pro"}</button>}</div>
    </section>

    {error&&<p className="error" style={{textAlign:"center",marginTop:12}}>{error}</p>}
    <div className="premium-trust"><span>🔒 Razorpay Secure</span><span>⚡ Instant Access</span><span>↩️ 7-Day Refund</span><span>💳 Cancel Anytime</span></div>

    <section className="card" style={{overflowX:"auto"}}><p className="eyebrow">Feature Comparison</p><h2>Compare All Plans</h2>
      <table className="premium-table"><thead><tr><th>Feature</th><th>Free</th><th className="th-premium">Premium</th><th className="th-pro">Pro</th></tr></thead>
      <tbody>{FEATURES.map((f,i)=><tr key={i}><td className="feat-name">{f.name}</td><td><FI value={f.free}/></td><td className={plan==="premium"?"td-highlight":""}><FI value={f.premium}/></td><td className={plan==="pro"?"td-highlight":""}><FI value={f.pro}/></td></tr>)}</tbody></table></section>

    <section className="card"><p className="eyebrow">FAQ</p><h2>Frequently Asked Questions</h2>
      <div className="premium-faq">{FAQ.map((item,i)=>{const cls="faq-item "+(openFaq===i?"open":"");return (<div key={i} className={cls} onClick={()=>setOpenFaq(openFaq===i?-1:i)}>
      <div className="faq-question"><span>{item.q}</span><span className="faq-arrow">{openFaq===i?"−":"+"}</span></div>
      {openFaq===i&&<p className="faq-answer">{item.a}</p>}</div>);})}</div></section>
  </main>
);
}
