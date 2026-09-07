import React from "react";

export default function EmptyState({ openBuilder }) {
  return (
    <div className="empty-state">
      <h2>No documents yet</h2>
      <p>Create your first resume, CV, or biodata. Everything will be saved here like projects.</p>

      <div className="row center">
        <button className="primary-btn" onClick={() => openBuilder("resume")}>
          Create Resume
        </button>

        <button className="ghost-btn" onClick={() => openBuilder("biodata")}>
          Create Biodata
        </button>
      </div>
    </div>
  );
}