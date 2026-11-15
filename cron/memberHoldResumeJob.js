import cron from "node-cron";
import { checkAndResumeExpiredHolds } from "../controllers/memberHoldController.js";

/**
 * Initializes the background scheduled job to check and resume 30-day membership holds.
 * Runs on server boot and every 15 minutes.
 */
export const initMemberHoldResumeCron = () => {
  // 1. Run immediately on server start to catch up on any holds that reached 30 days while offline
  checkAndResumeExpiredHolds().catch(err => {
    console.error("[CRON] Error during initial hold resume check:", err);
  });

  // 2. Schedule recurring check every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      await checkAndResumeExpiredHolds();
    } catch (err) {
      console.error("[CRON] Error checking expired member holds:", err);
    }
  });

  console.log("✅ Member Hold Auto-Resume Job initialized (Scheduled every 15 mins + startup check).");
};

