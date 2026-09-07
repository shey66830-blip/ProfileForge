import React, { useState, useEffect } from "react";
import { API_BASE } from "../config.js";
import { saveJob, unsaveJob, getSavedJobs } from "../services/savedJobService.js";
import { AppContext } from "../App.jsx";

import SearchFilters from "../components/jobSearch/SearchFilters.jsx";
import ResumeSelector from "../components/jobSearch/ResumeSelector.jsx";
import LocationSelector from "../components/jobSearch/LocationSelector.jsx";
import SearchSummary from "../components/jobSearch/SearchSummary.jsx";
import RecommendationBox from "../components/jobSearch/RecommendationBox.jsx";
import PremiumAdvice from "../components/jobSearch/PremiumAdvice.jsx";
import JobCard from "../components/jobSearch/JobCard.jsx";
import JobDetailsModal from "../components/jobSearch/JobDetailsModal.jsx";
import ApplyModal from "../components/jobSearch/ApplyModal.jsx";
import LoadingSkeleton from "../components/jobSearch/LoadingSkeleton.jsx";
import EmptyJobs from "../components/jobSearch/EmptyJobs.jsx";

const PER_PAGE = 12;

function sourceCounts(jobs) {
  const counts = {};
  jobs.forEach(j => { counts[j.source] = (counts[j.source] || 0) + 1; });
  return counts;
}

export default function JobSearch({ documents = [] }) {
  const [selectedResume, setSelectedResume] = useState("");
  const [keyword, setKeyword] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ lookingFor:"both", domain:"", specialization:"", experience:"fresher", workMode:"any", employmentType:"all", salary:"any", country:"", state:"", city:"" });

  const [allJobs, setAllJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [sortBy, setSortBy] = useState("match");
  const [quickFilter, setQuickFilter] = useState(null);
  const [skillSearch, setSkillSearch] = useState("");
  const { isPremium } = React.useContext(AppContext);

  const totalPages = Math.ceil(filteredJobs.length / PER_PAGE);
  const displayedJobs = filteredJobs.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const selectedDoc = documents.find(d => d._id === selectedResume);

  useEffect(() => { getSavedJobs().then(s => setSavedJobIds(new Set(s.map(j => j.jobId)))); }, []);

  async function handleToggleSave(job) {
    if (savedJobIds.has(job.id)) { await unsaveJob(job.id); setSavedJobIds(p => { const n = new Set(p); n.delete(job.id); return n; }); }
    else { await saveJob(job.id, job, job.source); setSavedJobIds(p => new Set(p).add(job.id)); }
  }

  function applyFiltersAndSort(jobs, sf, qf, sk, sort) {
    let f = [...jobs];
    if (sf.workMode !== "any") f = f.filter(j => sf.workMode === "remote" ? j.remote : !j.remote);
    if (sf.employmentType !== "all") { const t = sf.employmentType; f = f.filter(j => { const tp = (j.type||"").toLowerCase(); if (t==="internship") return tp.includes("intern"); if (t==="full_time") return tp.includes("full"); if (t==="part_time") return tp.includes("part"); if (t==="contract") return tp.includes("contract"); return true; }); }
    if (sf.lookingFor !== "both") f = f.filter(j => { const ti = (j.title||"").toLowerCase(); return sf.lookingFor === "internship" ? ti.includes("intern") : !ti.includes("intern"); });
    if (qf === "salary") f = f.filter(j => j.salary);
    if (qf === "remote") f = f.filter(j => j.remote);
    if (qf === "highMatch") f = f.filter(j => (j.match?.overall||0) >= 70);
    if (qf === "recent") { const w = Date.now() - 7*864e5; f = f.filter(j => j.publishedAt && new Date(j.publishedAt).getTime() > w); }
    if (sk) { const s = sk.toLowerCase(); f = f.filter(j => { const ms = (j.match?.matchedSkills||[]).map(x=>x.toLowerCase()); const ts = (j.title||"").toLowerCase(); const ds = (j.description||"").toLowerCase(); return ms.includes(s) || ts.includes(s) || ds.includes(s); }); }
    if (sort === "match") f.sort((a,b) => (b.match?.overall||0) - (a.match?.overall||0));
    if (sort === "salary") f.sort((a,b) => (b.salary?.max||0) - (a.salary?.max||0));
    if (sort === "date") f.sort((a,b) => new Date(b.publishedAt||0) - new Date(a.publishedAt||0));
    if (sort === "company") f.sort((a,b) => (a.company||"").localeCompare(b.company||""));
    return f;
  }

  function refilter(jobs, sf, qf, sk, sort) {
    const f = applyFiltersAndSort(jobs, sf, qf, sk, sort);
    setFilteredJobs(f); setPage(1);
  }

  function handleSortChange(s) { setSortBy(s); refilter(allJobs, filters, quickFilter, skillSearch, s); }
  function handleQuickFilter(qf) { const n = quickFilter === qf ? null : qf; setQuickFilter(n); refilter(allJobs, filters, n, skillSearch, sortBy); }
  function handleFilterSkill(sk) { setSkillSearch(sk); refilter(allJobs, filters, quickFilter, sk, sortBy); }
  function handleFilterRemote() { const sf = { ...filters, workMode: filters.workMode === "remote" ? "any" : "remote" }; setFilters(sf); refilter(allJobs, sf, quickFilter, skillSearch, sortBy); }

  async function handleSearch() {
    setLoading(true); setError(""); setHasSearched(true); setPage(1); setSkillSearch("");
    try {
      const resumeText = selectedDoc?.generatedText || "";
      const params = new URLSearchParams({ search: filters.specialization || filters.domain || "", category: filters.domain || "", country: filters.country || "all", resumeText });
      const res = await fetch(API_BASE + "/jobs?" + params, { credentials: "include" });
      const result = await res.json();
      if (result.success) { const f = applyFiltersAndSort(result.jobs, filters, null, "", sortBy); setAllJobs(f); setFilteredJobs(f); setQuickFilter(null); }
      else { setAllJobs([]); setFilteredJobs([]); }
    } catch (e) { setError("Failed to search. Make sure server is running."); setAllJobs([]); setFilteredJobs([]); }
    finally { setLoading(false); }
  }

  const src = sourceCounts(filteredJobs);
  const sortLabels = { match:"Match Score", salary:"Salary", date:"Date Posted", company:"Company" };

  return (
    <main className="container">
      <section className="card">
        <p className="eyebrow">Smart AI Job Search</p>
        <h1>Find Jobs & Internships</h1>
        <p>ProfileForge analyzes your resume and recommends the best opportunities with AI-powered matching.</p>
      </section>

      <ResumeSelector documents={documents} selectedResume={selectedResume} setSelectedResume={setSelectedResume} />

      {/* Search Bar */}
      <section className="card">
        <div className="js-search-bar">
          <div className="js-search-wrapper js-search-input-wrap">
            <span className="js-search-icon">🔍</span>
            <input className="js-search-input" placeholder="Search by title, skill, or company..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} />
          </div>
          <button className="js-toggle-filters" data-open={showFilters || undefined} onClick={() => setShowFilters(!showFilters)}>{showFilters ? "Hide Filters" : "Filters"}</button>
          <button className="primary-btn" onClick={handleSearch} disabled={!selectedResume}>Search Jobs</button>
        </div>

        <div className={"js-filters-collapse" + (showFilters ? " open" : "")}>
          <SearchFilters filters={filters} setFilters={setFilters} onSearch={handleSearch} />
          <LocationSelector filters={filters} setFilters={setFilters} />
        </div>
      </section>

      {hasSearched && !loading && filteredJobs.length > 0 && (<SearchSummary filters={filters} totalJobs={filteredJobs.length} jobs={filteredJobs} selectedResume={selectedResume} resumeName={selectedDoc?.title || ""} />)}
      <RecommendationBox jobs={allJobs} onOpenJob={setSelectedJob} />
      <PremiumAdvice unlocked={isPremium} jobs={allJobs} />

      {error && <section className="card" style={{ borderLeft:"3px solid var(--error)" }}><p className="error">{error}</p></section>}
      {loading && <LoadingSkeleton />}
      {!loading && !hasSearched && !error && (
        <section className="card" style={{ textAlign:"center", padding:50 }}><div style={{ fontSize:60, marginBottom:12 }}>🔍</div><h2>Ready to Search</h2><p className="muted">Select a resume and click Search to find matched opportunities.</p></section>
      )}
      {!loading && hasSearched && filteredJobs.length === 0 && !error && <EmptyJobs />}

      {/* Results */}
      {!loading && displayedJobs.length > 0 && (<>
        {/* Results Header */}
        <div className="js-results-header">
          <div className="js-results-info">
            <strong>{filteredJobs.length}</strong> jobs found
            {Object.keys(src).length > 0 && (<span className="js-source-tags" style={{ marginLeft:8 }}>{Object.entries(src).map(([k,v]) => <span key={k} className="js-source-tag">{k}: {v}</span>)}</span>)}
            {skillSearch && <span style={{ marginLeft:8, fontSize:12 }}>• Filtered by: <strong>{skillSearch}</strong> <button onClick={() => handleFilterSkill("")} style={{ background:"none", border:"none", color:"var(--error)", cursor:"pointer", fontSize:12 }}>✕</button></span>}
          </div>
          <div className="js-sort-wrap">
            <span style={{ fontSize:12, color:"var(--text-muted)" }}>Sort:</span>
            <select className="js-sort-select" value={sortBy} onChange={e => handleSortChange(e.target.value)}>
              <option value="match">Match Score</option>
              <option value="salary">Salary</option>
              <option value="date">Date Posted</option>
              <option value="company">Company</option>
            </select>
          </div>
        </div>

        {/* Quick Filters */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
          {[ ["salary","💰 Has Salary"],["remote","🌐 Remote"],["highMatch","🎯 Match>70%"],["recent","⏵ Last 7 Days"] ].map(([k,l]) => (
            <button key={k} className={quickFilter===k ? "primary-btn small" : "ghost-btn small"} onClick={() => handleQuickFilter(k)}>{l}</button>
          ))}
          {quickFilter && <button className="ghost-btn small" onClick={() => handleQuickFilter(null)}>✕ Clear</button>}
        </div>

        <section className="grid three">
          {displayedJobs.map(job => (
            <JobCard key={job.id} job={job} openJob={setSelectedJob} applyJob={j => { setSelectedJob(j); setShowApplyModal(true); }} isSaved={savedJobIds.has(job.id)} onToggleSave={handleToggleSave} onFilterSkill={handleFilterSkill} onFilterRemote={handleFilterRemote} />
          ))}
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="js-pagination">
            <button className="js-page-btn" disabled={page<=1} onClick={() => setPage(p => p-1)}>← Prev</button>
            {Array.from({length: Math.min(totalPages, 7)}, (_, i) => {
              let p;
              if (totalPages <= 7) p = i + 1;
              else if (page <= 4) p = i + 1;
              else if (page >= totalPages - 3) p = totalPages - 6 + i;
              else p = page - 3 + i;
              return <button key={p} className={"js-page-btn" + (p===page ? " active" : "")} onClick={() => setPage(p)}>{p}</button>;
            })}
            <button className="js-page-btn" disabled={page>=totalPages} onClick={() => setPage(p => p+1)}>Next →</button>
          </div>
        )}
      </>)}

      {selectedJob && !showApplyModal && <JobDetailsModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
      {showApplyModal && <ApplyModal job={selectedJob} onClose={() => setShowApplyModal(false)} documentId={selectedResume} />}
    </main>
  );
}