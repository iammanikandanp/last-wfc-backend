import { WeightHistory } from "../models/WeightHistory.js";
import { Registration } from "../models/registration.js";

export const createWeightHistoryEntry = async (req, res) => {
  try {
    const { registrationId, memberName, weight, recordDate, recordTime, notes, createdBy, recordType = "update" } = req.body;

    if (!registrationId || weight === undefined || weight === null || weight === "") {
      return res.status(400).json({ success: false, message: "registrationId and weight are required" });
    }

    const member = await Registration.findById(registrationId);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const entry = await WeightHistory.create({
      registrationId,
      memberName: memberName || member.name || "",
      weight: Number(weight),
      recordDate: recordDate ? new Date(recordDate) : new Date(),
      recordTime: recordTime || "",
      notes: notes || "",
      createdBy: createdBy || req.user?._id || null,
      recordType,
    });

    await Registration.findByIdAndUpdate(registrationId, {
      weight: Number(weight),
      updatedAt: new Date(),
    });

    return res.status(201).json({ success: true, entry });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getWeightHistoryByMember = async (req, res) => {
  try {
    const records = await WeightHistory.find({ registrationId: req.params.id })
      .sort({ recordDate: 1, recordTime: 1, createdAt: 1 });

    return res.status(200).json({ success: true, records });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getLatestWeightHistoryByMember = async (req, res) => {
  try {
    const latest = await WeightHistory.findOne({ registrationId: req.params.id }).sort({ recordDate: -1, recordTime: -1, createdAt: -1 });
    return res.status(200).json({ success: true, record: latest });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
