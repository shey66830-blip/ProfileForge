import React from "react";
import { deleteDocumentFromBackend } from "../services/documentService.js";

export default function DocumentCard({ doc, openDocument, editDocument, onDelete }) {
  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    const result = await deleteDocumentFromBackend(doc._id);
    if (result.ok && onDelete) {
      onDelete(doc._id);
    }
  };

  return (
    <div className="doc-card">
      <div>
        <p className="eyebrow">{doc.type.toUpperCase()}</p>
        <h3>{doc.title}</h3>
        <p>{doc.data?.name || "Unnamed profile"}</p>
        <p className="muted">
          Last edited: {new Date(doc.updatedAt).toLocaleString()}
        </p>
      </div>

      <div className="row">
        <button className="ghost-btn" onClick={() => editDocument(doc)}>
          Edit
        </button>
        <button className="primary-btn small" onClick={() => openDocument(doc)}>
          Open
        </button>
        <button className="ghost-btn delete-btn" onClick={handleDelete} title="Delete document">
          ✕
        </button>
      </div>
    </div>
  );
}