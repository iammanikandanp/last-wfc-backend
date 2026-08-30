import { ProgressPhotoSession } from "../models/ProgressPhotoSession.js";

// ── POST /api/v1/progress-photo-session ───────────────────────────────────────────────
export const createSession = async (req, res) => {
  try {
    const { registrationId, date, notes } = req.body;

    if (!registrationId) {
      return res.status(400).json({ success: false, message: "registrationId is required" });
    }

    const frontImage = req.files?.frontImage?.[0]?.path || "";
    const sideImage = req.files?.sideImage?.[0]?.path || "";
    const backImage = req.files?.backImage?.[0]?.path || "";

    const session = await ProgressPhotoSession.create({
      registration: registrationId,
      date: date ? new Date(date) : new Date(),
      frontImage,
      sideImage,
      backImage,
      notes: notes || "",
      uploadedBy: req.user._id,
    });

    return res.status(201).json({ success: true, data: session });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/progress-photo-session/member/:id ──────────────────────────────────────
export const getSessionsByMember = async (req, res) => {
  try {
    if (
      req.user.role === "member" &&
      (!req.user.registrationId || req.user.registrationId.toString() !== req.params.id)
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const sessions = await ProgressPhotoSession.find({ registration: req.params.id }).sort({ date: -1 });

    return res.status(200).json({ success: true, data: sessions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
