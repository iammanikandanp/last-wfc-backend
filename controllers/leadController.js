import { Lead } from "../models/Lead.js";

export const createLead = async (req, res) => {
  try {
    const lead = new Lead(req.body);
    await lead.save();
    return res.status(201).json({ success: true, message: "Lead added", lead });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: leads.length, leads });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    return res.status(200).json({ success: true, lead });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    return res.status(200).json({ success: true, message: "Lead deleted" });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const getLeadStats = async (req, res) => {
  try {
    const all = await Lead.find();
    return res.status(200).json({
      success: true,
      stats: {
        total:     all.length,
        new:       all.filter(l => l.status === "New").length,
        contacted: all.filter(l => l.status === "Contacted").length,
        interested:all.filter(l => l.status === "Interested").length,
        converted: all.filter(l => l.status === "Converted").length,
        lost:      all.filter(l => l.status === "Lost").length,
      }
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};