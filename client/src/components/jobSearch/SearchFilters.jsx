import React from "react";

export const ALL_JOB_SOURCES = ["Remotive","Adzuna","JSearch","Arbeitnow","Jobicy","Himalayas"];

const careerDomains = ["Engineering","Medical & Healthcare","Business & Management","Finance & Accounting","Law","Teaching & Education","Research","Government","Defence","Design","Media & Journalism","Hospitality","Agriculture","Arts","Science","Others"];

export default function SearchFilters({ filters, setFilters }) {
  const update = (f, v) => setFilters(p => ({ ...p, [f]: v }));
  // Unchecking a source narrows future searches; the empty list means "all".
  const toggleSource = (s) => setFilters(p => {
    const cur = Array.isArray(p.sources) ? p.sources : ALL_JOB_SOURCES;
    const next = cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s];
    return { ...p, sources: next };
  });

  return (<section style={{ paddingTop:8 }}>
    <div className="grid two"><div><label>Looking For</label><select value={filters.lookingFor} onChange={e => update("lookingFor",e.target.value)}><option value="both">Jobs + Internships</option><option value="job">Jobs</option><option value="internship">Internships</option></select></div>
    <div><label>Career Domain</label><select value={filters.domain} onChange={e => update("domain",e.target.value)}><option value="">Select Domain</option>{careerDomains.map(d => <option key={d}>{d}</option>)}</select></div></div>
    <div className="grid two"><div><label>Specialization</label><input placeholder="e.g. Computer Science, Civil Engineering..." value={filters.specialization} onChange={e => update("specialization",e.target.value)} /></div>
    <div><label>Experience</label><select value={filters.experience} onChange={e => update("experience",e.target.value)}><option value="fresher">Fresher</option><option value="0-1">0-1 Years</option><option value="1-3">1-3 Years</option><option value="3-5">3-5 Years</option><option value="5+">5+ Years</option></select></div></div>
    <div className="grid three"><div><label>Work Mode</label><select value={filters.workMode} onChange={e => update("workMode",e.target.value)}><option value="any">Any</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></div>
    <div><label>Employment Type</label><select value={filters.employmentType} onChange={e => update("employmentType",e.target.value)}><option value="all">All</option><option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="internship">Internship</option><option value="contract">Contract</option><option value="freelance">Freelance</option></select></div>
    <div><label>Salary Level</label><select value={filters.salary} onChange={e => update("salary",e.target.value)}><option value="any">Any</option><option value="entry">Entry Level</option><option value="mid">Mid Level</option><option value="senior">Senior</option></select></div></div>
    <div style={{ marginTop:12 }}><label>Sources</label><div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:6 }}>{ALL_JOB_SOURCES.map(s => (<label key={s} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"var(--text-muted)", cursor:"pointer" }}><input type="checkbox" checked={(Array.isArray(filters.sources) ? filters.sources : ALL_JOB_SOURCES).includes(s)} onChange={() => toggleSource(s)} style={{ accentColor:"var(--accent-1)" }} /> {s}</label>))}</div></div>
  </section>);
}