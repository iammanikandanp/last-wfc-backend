import { BlockList } from "../models/BlockList.js";

// ── POST /api/v1/block-list ───────────────────────────────────────────────────
export const createBlockEntry = async (req, res) => {
  try {
    const { registrationId, memberName, memberPhone, reason } = req.body;
    if (!memberName || !memberPhone) {
      return res.status(400).json({ success: false, message: "memberName and memberPhone are required" });
    }

    const exists = await BlockList.findOne({ memberPhone: memberPhone.trim() });
    if (exists) {
      return res.status(200).json({ success: true, message: "Already on block list", data: exists });
    }

    const entry = await BlockList.create({
      registrationId: registrationId || undefined,
      memberName:  memberName.trim(),
      memberPhone: memberPhone.trim(),
      reason:      reason || "",
      blockedBy:   req.user?._id,
    });

    return res.status(201).json({ success: true, data: entry });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/block-list ────────────────────────────────────────────────────
export const getAllBlockEntries = async (req, res) => {
  try {
    const entries = await BlockList.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: entries });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/v1/block-list/:id  (unblock) ──────────────────────────────────
export const deleteBlockEntry = async (req, res) => {
  try {
    const entry = await BlockList.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: "Block entry not found" });
    return res.status(200).json({ success: true, message: "Member unblocked", data: entry });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
