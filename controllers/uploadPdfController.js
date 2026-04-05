import multer from "multer";
import cloudinary from "../utils/cloudinary.js";
import { Readable } from "stream";

// In-memory storage for PDF uploads
export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");
    ok ? cb(null, true) : cb(new Error("Only PDF files are allowed"), false);
  },
});

// POST /api/v1/upload-pdf
// Accepts multipart/form-data with field "file" (PDF) and optional "fileName"
export const uploadInvoicePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No PDF file provided" });
    }

    const rawName = (req.body.fileName || `invoice-${Date.now()}`).replace(/\.pdf$/i, "").replace(/\s+/g, "-");
    const publicId = `wfc-invoices/${rawName}`;

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "raw", folder: "wfc-invoices", public_id: publicId },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      Readable.from(req.file.buffer).pipe(stream);
    });

    return res.status(200).json({ success: true, url: uploadResult.secure_url });
  } catch (err) {
    console.error("uploadInvoicePdf error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
