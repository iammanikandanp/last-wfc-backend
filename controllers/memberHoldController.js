import { Registration } from "../models/registration.js";
import {
  parseLocalDate,
  toLocalDateStr,
  getCalendarDiffDays,
  computeMembershipStatus,
} from "../utils/helpers.js";

/**
 * Resumes a member currently on hold.
 * Extends the package End Date by the actual number of completed hold days (max 30).
 * Recalculates the member's status and remaining days.
 * Safe against duplicate calls.
 */
export const resumeMemberHold = async (member, unheldBy = "system") => {
  if (!member || !member.isOnHold) return member;

  const now = new Date();
  const todayStr = toLocalDateStr(now);
  const todayDate = parseLocalDate(todayStr);

  const holdStart = parseLocalDate(toLocalDateStr(member.holdStartDate));
  const scheduledResume = member.scheduledResumeDate
    ? parseLocalDate(toLocalDateStr(member.scheduledResumeDate))
    : new Date(holdStart.getTime() + 30 * 86400000);

  // If auto-resuming past the 30-day limit, actual hold end is capped at the 30-day mark
  let actualResumeDate = todayDate;
  if (unheldBy === "system" || todayDate >= scheduledResume) {
    actualResumeDate = scheduledResume;
  }

  // Calculate actual calendar days held (0 to 30)
  let rawDays = getCalendarDiffDays(actualResumeDate, holdStart);
  if (rawDays === null || rawDays < 0) rawDays = 0;
  const daysHeld = Math.min(30, rawDays);

  // Calculate new extended End Date from original base end date
  const baseEndDate = parseLocalDate(toLocalDateStr(member.originalEndDateBeforeHold || member.endDate));
  const newEndDate = new Date(baseEndDate);
  newEndDate.setDate(newEndDate.getDate() + daysHeld);

  // Recalculate status from new end date
  const newStatus = computeMembershipStatus(member.startDate, newEndDate);

  member.isOnHold = false;
  member.status = newStatus;
  member.endDate = newEndDate;
  member.actualHoldEndDate = actualResumeDate;

  // Update latest active entry in hold history
  if (member.holdHistory && member.holdHistory.length > 0) {
    const activeEntry = [...member.holdHistory].reverse().find(h => h.status === "active");
    if (activeEntry) {
      activeEntry.actualHoldEndDate = actualResumeDate;
      activeEntry.daysHeld = daysHeld;
      activeEntry.newEndDate = newEndDate;
      activeEntry.status = "completed";
      activeEntry.unheldBy = unheldBy;
      activeEntry.unheldAt = new Date();
    }
  }

  member.frozenRemainingDays = 0;
  member.holdReason = "";

  await member.save();
  return member;
};

/**
 * Checks all members with active holds that have reached or passed their 30-day scheduled resume date.
 * Resumes each hold automatically.
 */
export const checkAndResumeExpiredHolds = async () => {
  try {
    const now = new Date();
    const expiredMembers = await Registration.find({
      isOnHold: true,
      scheduledResumeDate: { $lte: now },
    });

    let count = 0;
    for (const member of expiredMembers) {
      await resumeMemberHold(member, "system");
      count++;
    }

    if (count > 0) {
      console.log(`[HOLD SYSTEM] Automatically resumed ${count} membership hold(s) after 30 days.`);
    }
    return count;
  } catch (err) {
    console.error("[HOLD SYSTEM] Error checking expired holds:", err);
    return 0;
  }
};

/**
 * POST /api/v1/members/:id/hold
 * Places an active member's membership package on hold (Admin only).
 * Freezes remaining days and schedules auto-resume after 30 days.
 */
export const holdMember = async (req, res) => {
  try {
    const member = await Registration.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    if (member.status === "blocked") {
      return res.status(400).json({ success: false, message: "Cannot put a blocked member on hold" });
    }

    if (member.isOnHold) {
      return res.status(400).json({ success: false, message: "Member is already on hold" });
    }

    if (!member.endDate) {
      return res.status(400).json({ success: false, message: "Member has no active package to put on hold" });
    }

    const todayStr = toLocalDateStr(new Date());
    const remainingDays = getCalendarDiffDays(member.endDate, todayStr);

    if (remainingDays === null || remainingDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot put an expired membership on hold. Only active packages with remaining days can be held.",
      });
    }

    const holdStartDate = parseLocalDate(todayStr);
    const scheduledResumeDate = new Date(holdStartDate);
    scheduledResumeDate.setDate(scheduledResumeDate.getDate() + 30); // Exactly 30 calendar days

    member.isOnHold = true;
    member.status = "hold";
    member.holdStartDate = holdStartDate;
    member.scheduledResumeDate = scheduledResumeDate;
    member.frozenRemainingDays = remainingDays;
    member.holdReason = req.body.reason ? String(req.body.reason).trim() : "";
    member.originalEndDateBeforeHold = member.endDate;

    if (!member.holdHistory) member.holdHistory = [];
    member.holdHistory.push({
      holdStartDate,
      scheduledResumeDate,
      frozenRemainingDays: remainingDays,
      reason: member.holdReason,
      status: "active",
      heldBy: req.user?._id,
      heldAt: new Date(),
    });

    await member.save();

    return res.status(200).json({
      success: true,
      message: `Membership placed on hold. Frozen at ${remainingDays} remaining days.`,
      member,
    });
  } catch (err) {
    console.error("holdMember error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/members/:id/unhold
 * Manually unholds a member's membership package (Admin only).
 * Resumes membership immediately and extends End Date by actual days held.
 */
export const unholdMember = async (req, res) => {
  try {
    const member = await Registration.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    if (!member.isOnHold) {
      return res.status(400).json({ success: false, message: "Member is not currently on hold" });
    }

    const updatedMember = await resumeMemberHold(member, req.user?._id || "admin");

    return res.status(200).json({
      success: true,
      message: "Membership resumed successfully. End Date extended by completed hold duration.",
      member: updatedMember,
    });
  } catch (err) {
    console.error("unholdMember error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/members/:id/hold-history
 * Retrieves hold history for a member.
 */
export const getMemberHoldHistory = async (req, res) => {
  try {
    const member = await Registration.findById(req.params.id, "holdHistory isOnHold holdStartDate scheduledResumeDate frozenRemainingDays holdReason");
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }
    return res.status(200).json({
      success: true,
      isOnHold: !!member.isOnHold,
      holdDetails: {
        startDate: member.holdStartDate,
        scheduledResumeDate: member.scheduledResumeDate,
        frozenRemainingDays: member.frozenRemainingDays,
        reason: member.holdReason,
      },
      history: member.holdHistory || [],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

