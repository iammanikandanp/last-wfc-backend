import { RecycleBin } from "../models/RecycleBin.js";
import mongoose from "mongoose";

// ── GET /api/v1/recycle-bin ───────────────────────────────────────────────────
export const getRecycleBin = async (req, res) => {
  try {
    const items = await RecycleBin.find()
      .populate("deletedBy", "name email")
      .sort({ deletedAt: -1 });
    return res.status(200).json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/v1/recycle-bin/:id/restore ──────────────────────────────────────
export const restoreItem = async (req, res) => {
  try {
    const binItem = await RecycleBin.findById(req.params.id);
    if (!binItem) {
      return res.status(404).json({ success: false, message: "Item not found in Recycle Bin" });
    }

    const Model = mongoose.model(binItem.originalCollection);
    if (!Model) {
      return res.status(400).json({ success: false, message: "Original collection model not found" });
    }

    // Try to re-create the document exactly as it was
    const restoredDoc = new Model(binItem.data);
    await restoredDoc.save({ validateBeforeSave: false }); // Bypass validation in case of old missing fields

    // Remove from Recycle Bin
    await RecycleBin.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: "Item restored successfully", data: restoredDoc });
  } catch (err) {
    // Check if error is due to duplicate key
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "Cannot restore item: A record with this ID or unique field already exists." });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};
