import React, { useState } from "react";
import DocumentCard from "../components/DocumentCard.jsx";
import EmptyState from "../components/EmptyState.jsx";

const featureData = {
  resume: [
    ["ATS-friendly resume builder", "Free"],
    ["PDF download", "Free"],
    ["Job & internship matching", "Free"],
    ["AI resume improvement", "Premium"],
    ["Advanced templates", "Premium"],
  ],
  cv: [
    ["Academic / research CV builder", "Free"],
    ["Project and education focused layout", "Free"],
    ["PDF download", "Free"],
    ["AI CV polishing", "Premium"],
    ["Scholarship / research profile optimization", "Premium"],
  ],
  biodata: [
    ["Marriage biodata builder", "Premium"],
    ["Family and partner preference sections", "Premium"],
    ["Biodata PDF export", "Premium"],
    ["Matchmaking mode", "Premium"],
    ["Premium biodata templates", "Premium"],
  ],
};

export default function Dashboard({
  documents,
  openBuilder,
  openDocument,
  editDocument,
  setPage,
  onDeleteDocument,
}) {
  const [activeTab, setActiveTab] = useState("resume");

  const filteredDocs = documents.filter((doc) => doc.type === activeTab);

  return (
    <main className="container">
      <section className="card split-card">
        <div>
          <p className="eyebrow">My workspace</p>
          <h1>Dashboard</h1>
          <p>
            Manage your Career Mode and Personal Mode tools from one clean
            workspace.
          </p>
        </div>

        <div className="row">
          <button className="primary-btn small" onClick={() => setPage("jobs")}>
            Jobs
          </button>
          <button className="secondary-btn small" onClick={() => setPage("ai-editor")}>
            AI Edit
          </button>
        </div>
      </section>

      <section className="card dashboard-tabs-card">
        <div className="mode-tabs">
          <button
            className={activeTab === "resume" ? "mode-tab active" : "mode-tab"}
            onClick={() => setActiveTab("resume")}
          >
            Resume
          </button>

          <button
            className={activeTab === "cv" ? "mode-tab active" : "mode-tab"}
            onClick={() => setActiveTab("cv")}
          >
            CV
          </button>

          <button
            className={activeTab === "biodata" ? "mode-tab active premium-tab" : "mode-tab premium-tab"}
            onClick={() => setActiveTab("biodata")}
          >
            Biodata 🔒
          </button>
        </div>

        <div className="feature-table-wrap">
          <table className="feature-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Access</th>
              </tr>
            </thead>

            <tbody>
              {featureData[activeTab].map(([feature, access]) => (
                <tr key={feature}>
                  <td>{feature}</td>
                  <td>
                    <span className={access === "Free" ? "free-badge" : "premium-badge"}>
                      {access}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row">
          {activeTab === "resume" && (
            <button className="primary-btn" onClick={() => openBuilder("resume")}>
              Create Resume
            </button>
          )}

          {activeTab === "cv" && (
            <button className="primary-btn" onClick={() => openBuilder("cv")}>
              Create CV
            </button>
          )}

          {activeTab === "biodata" && (
            <>
              <button className="primary-btn" onClick={() => openBuilder("biodata")}>
                Create Biodata
              </button>

              <button className="ghost-btn" onClick={() => setPage("matchmaking")}>
                Open Matchmaking
              </button>
            </>
          )}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Saved {activeTab.toUpperCase()} documents</p>

        {documents.length === 0 ? (
          <EmptyState openBuilder={openBuilder} />
        ) : filteredDocs.length === 0 ? (
          <p className="muted">
            No saved {activeTab} yet. Create one using the button above.
          </p>
        ) : (
          <div className="grid two">
            {filteredDocs.map((doc) => (
              <DocumentCard
                key={doc._id || doc.id}
                doc={doc}
                openDocument={openDocument}
                editDocument={editDocument}
                onDelete={onDeleteDocument}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}