import { BlockList } from "../models/BlockList.js";
import { Registration } from "../models/registration.js";
import { computeMembershipStatus } from "../utils/helpers.js";

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

    // If this block entry references an existing registration (by id or phone), mark the registration as blocked
    try {
      let reg = null;
      if (registrationId) {
        reg = await Registration.findById(registrationId);
      } else {
        reg = await Registration.findOne({ phone: memberPhone.trim() });
      }
      if (reg) {
        reg.status = "blocked";
        await reg.save();
      }
    } catch (e) {
      console.error("Failed to mark registration as blocked:", e.message);
    }

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

    // If the entry referenced a registration, attempt to recalculate and restore its status
    if (entry.registrationId) {
      try {
        const reg = await Registration.findById(entry.registrationId);
        if (reg) {
          const newStatus = computeMembershipStatus(reg.startDate, reg.endDate);
          reg.status = newStatus;
          await reg.save();
        }
      } catch (e) {
        console.error("Failed to recalc registration status after unblock:", e.message);
      }
    }

    return res.status(200).json({ success: true, message: "Member unblocked", data: entry });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
