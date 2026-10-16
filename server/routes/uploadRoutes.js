import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { protect } from "../middleware/authMiddleware.js";
import { extractFields, cleanPdfText } from "../services/resumeExtractor.js";
import { extractCVFields } from "../services/cvExtractor.js";

// PDF parsing is loaded lazily so running the server's unit tests (`npm test`)
// never pulls the pdfjs runtime into the process before a PDF is actually needed.
// The test runner evaluates file top-level import statements before any test,
// and pdfjs-dist's legacy build has runtime web-api deps (DOMMatrix etc.) that
// throw in Node's test execution model even when the import is never consumed.
let createPDFParser;
async function getPDFParser() {
  if (!createPDFParser) {
    const { PDFParse } = await import("pdf-parse");
    createPDFParser = (opts) => new PDFParse(opts);
  }
  return createPDFParser;
}

const router = express.Router();

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error("Only PDF, DOCX, or TXT files are allowed."));
    }
    if (
      file.mimetype &&
      !ALLOWED_MIMES.includes(file.mimetype) &&
      file.mimetype !== "application/octet-stream"
    ) {
      return cb(new Error("File type not allowed."));
    }
    cb(null, true);
  },
});

// Both document kinds accept the same upload, and the field name differs by
// client build ("resume" or "cv"), so accept either and pick whichever arrived.
const resumeUpload = upload.fields([
  { name: "resume", maxCount: 1 },
  { name: "cv", maxCount: 1 },
]);

function uploadedFile(req) {
  return req.files?.resume?.[0] || req.files?.cv?.[0] || null;
}

// Validates the file signature and turns the upload into plain text. Returns
// `{ ok: true, text }` or `{ ok: false, message }`; the temp file is always
// removed before returning.
async function readUploadedText(req) {
  const file = uploadedFile(req);
  const filePath = file?.path;
  try {
    if (!file) return { ok: false, message: "No file uploaded." };

    const originalName = file.originalname.toLowerCase();
    const ext = path.extname(originalName);
    const buffer = fs.readFileSync(filePath);

    // Validate file signature (magic bytes) for PDF and DOCX
    if (ext === ".pdf" && !buffer.slice(0, 4).toString().startsWith("%PDF")) {
      return { ok: false, message: "File does not appear to be a valid PDF." };
    }
    if (ext === ".docx") {
      // DOCX is a ZIP archive — check for PK header
      const headerBytes = buffer.slice(0, 4);
      if (headerBytes[0] !== 0x50 || headerBytes[1] !== 0x4b) {
        return { ok: false, message: "File does not appear to be a valid DOCX." };
      }
    }

    if (ext === ".pdf") {
      const Parser = await getPDFParser();
      const parser = Parser({ data: buffer, verbosity: 0 });
      const parsed = await parser.getText();
      return { ok: true, text: cleanPdfText(parsed.text || "") };
    }
    if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: filePath });
      return { ok: true, text: result.value };
    }
    if (ext === ".txt") {
      return { ok: true, text: buffer.toString("utf-8") };
    }
    return { ok: false, message: "Only PDF, DOCX, or TXT files are allowed." };
  } catch (err) {
    return { ok: false, message: err.message };
  } finally {
    // Clean up the uploaded temp file immediately, success or failure.
    if (filePath) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }
  }
}

router.post("/resume", protect, resumeUpload, async (req, res) => {
  const result = await readUploadedText(req);
  if (!result.ok) return res.json(result);
  res.json({
    ok: true,
    documentType: "resume",
    text: result.text,
    fields: extractFields(result.text),
  });
});

// A CV is read differently: sections are scholarship-shaped (publications,
// grants, teaching, referees) and the checklist asks for a complete academic
// record rather than a keyword-friendly resume.
router.post("/cv", protect, resumeUpload, async (req, res) => {
  const result = await readUploadedText(req);
  if (!result.ok) return res.json(result);
  res.json({
    ok: true,
    documentType: "cv",
    text: result.text,
    fields: extractCVFields(result.text),
  });
});

export default router;
