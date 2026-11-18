import { ProgressPhotoSession } from "../models/ProgressPhotoSession.js";
import { moveToRecycleBin } from "../utils/recycle.js";

const LOCKED_PHOTO_PLACEHOLDER = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 400 500'%3E%3Crect width='100%25' height='100%25' fill='%231e293b'/%3E%3Ccircle cx='200' cy='200' r='50' fill='%23334155'/%3E%3Cpath d='M130 340c0-38 31-70 70-70s70 32 70 70' fill='%23334155'/%3E%3Crect x='180' y='210' width='40' height='30' rx='6' fill='%23f59e0b'/%3E%3Ccircle cx='200' cy='195' r='14' stroke='%23f59e0b' stroke-width='6' fill='none'/%3E%3Ctext x='200' y='380' font-family='sans-serif' font-size='16' font-weight='bold' fill='%2394a3b8' text-anchor='middle'%3EPhoto Restricted%3C/text%3E%3C/svg%3E";

const sanitizeSessionForTrainer = (session) => {
  const obj = session.toObject ? session.toObject() : { ...session };
  if (obj.frontImage) obj.frontImage = LOCKED_PHOTO_PLACEHOLDER;
  if (obj.sideImage) obj.sideImage = LOCKED_PHOTO_PLACEHOLDER;
  if (obj.backImage) obj.backImage = LOCKED_PHOTO_PLACEHOLDER;
  obj.isLocked = true;
  return obj;
};

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

    // Idempotency check: prevent duplicate submissions within 5 seconds
    const recent = await ProgressPhotoSession.findOne({
      registration: registrationId,
      createdAt: { $gte: new Date(Date.now() - 5000) }
    });
    if (recent) {
      const data = req.user?.role === "trainer" ? sanitizeSessionForTrainer(recent) : recent;
      return res.status(200).json({ success: true, data, message: "Duplicate prevented" });
    }

    const session = await ProgressPhotoSession.create({
      registration: registrationId,
      date: date ? new Date(date) : new Date(),
      frontImage,
      sideImage,
      backImage,
      notes: notes || "",
      uploadedBy: req.user._id,
    });

    if (req.user?.role === "trainer") {
      return res.status(201).json({ success: true, data: sanitizeSessionForTrainer(session) });
    }

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

    if (req.user?.role === "trainer") {
      const sanitized = sessions.map(sanitizeSessionForTrainer);
      return res.status(200).json({ success: true, data: sanitized });
    }

    return res.status(200).json({ success: true, data: sessions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/v1/progress-photo-session/:id ──────────────────────────────────────
export const deleteSession = async (req, res) => {
  try {
    if (req.user?.role === "trainer") {
      return res.status(403).json({ success: false, message: "Trainers cannot delete progress photo sessions" });
    }
    const record = await ProgressPhotoSession.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Session not found" });
    
    await moveToRecycleBin(ProgressPhotoSession, req.params.id, "ProgressPhotoSession", req.user?._id);
    return res.status(200).json({ success: true, message: "Session moved to recycle bin" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
