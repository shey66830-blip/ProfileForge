import express from "express";
import {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
} from "../controllers/documentController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createDocument);
router.get("/", protect, getDocuments);
router.get("/:id", protect, getDocumentById);
router.put("/:id", protect, updateDocument);
router.delete("/:id", protect, deleteDocument);

export default router;