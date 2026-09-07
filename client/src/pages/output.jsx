import React, { useRef } from "react";
import html2pdf from "html2pdf.js";

export default function Output({ document, editDocument, setPage }) {
  const pdfRef = useRef(null);

  const isBiodata = document.type === "biodata";

  const downloadPDF = () => {
    const element = pdfRef.current;

    const options = {
      margin: 0.35,
      filename: `${document.title}.pdf`,
      image: { type: "jpeg", quality: 0.98 },

      html2canvas: {
        scale: 2,
        useCORS: true,
      },

      jsPDF: {
        unit: "in",
        format: "a4",
        orientation: "portrait",
      },
    };

    html2pdf().set(options).from(element).save();
  };

  return (
    <main className="output-page">
      <section className="card output-topbar no-print">
        <div>
          <p className="eyebrow">
            {document.type.toUpperCase()} generated
          </p>

          <h1>{document.title}</h1>

          <p>
            Your document has been generated successfully and is ready for PDF
            export.
          </p>
        </div>

        <div className="output-actions">
          <button
            className="ghost-btn"
            onClick={() => editDocument(document)}
          >
            Edit
          </button>

          <button
            className="secondary-btn"
            onClick={() => setPage("ai-editor")}
          >
            AI Improve
          </button>

          <button
            className="primary-btn"
            onClick={downloadPDF}
          >
            Download PDF
          </button>
        </div>
      </section>

      <section className="document-shell">
        <section
          ref={pdfRef}
          className={`pdf-document ${
            isBiodata ? "biodata-theme" : "resume-theme"
          }`}
        >
          <header className="pdf-header">
            <div>
              <h1>{document.data?.name || "Your Name"}</h1>

              <div className="pdf-contact">
                {document.data?.email && (
                  <span>{document.data.email}</span>
                )}

                {document.data?.phone && (
                  <span>{document.data.phone}</span>
                )}

                {document.data?.location && (
                  <span>{document.data.location}</span>
                )}
              </div>
            </div>

            <div className="document-badge">
              {document.type.toUpperCase()}
            </div>
          </header>

          <div className="pdf-body">
            <pre>{document.generatedText}</pre>
          </div>
        </section>
      </section>

      <section className="grid two no-print">
        {!isBiodata && (
          <button
            className="big-action"
            onClick={() => setPage("jobs")}
          >
            Search Jobs & Internships
          </button>
        )}

        {isBiodata && (
          <button
            className="big-action"
            onClick={() => setPage("matchmaking")}
          >
            Find Marriage Matches
          </button>
        )}

        <button
          className="big-action"
          onClick={() => setPage("dashboard")}
        >
          Back to Dashboard
        </button>
      </section>
    </main>
  );
}