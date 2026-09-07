import { API_BASE } from "../config.js";

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/documents`, {
    credentials: "include",
  });

  const data = await res.json();
  return data.documents || [];
}

export async function saveDocumentToBackend(document) {
  const method = document._id ? "PUT" : "POST";
  const url = document._id
    ? `${API_BASE}/documents/${document._id}`
    : `${API_BASE}/documents`;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(document),
  });

  return res.json();
}

export async function deleteDocumentFromBackend(id) {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  return res.json();
}