import cron from "node-cron";
import { CafeteriaTransaction } from "../models/CafeteriaTransaction.js";
import { CafeteriaDailyRevenue } from "../models/CafeteriaDailyRevenue.js";
import { Income } from "../models/Income.js";
import { IncomeCategory } from "../models/IncomeCategory.js";

// Helper to get local date string YYYY-MM-DD for IST (since the business runs in India)
const getLocalDateString = (dateObj) => {
  // Use en-CA or en-GB to get standard date format, we use en-CA for YYYY-MM-DD
  const opts = { timeZone: "Asia/Kolkata", year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', opts);
  return formatter.format(dateObj); // Returns YYYY-MM-DD
};

export const processDailyCafeteriaRevenue = async (targetDateStr = null) => {
  try {
    const businessDate = targetDateStr || getLocalDateString(new Date());

    // 1. Check if we already processed for this businessDate
    const existing = await CafeteriaDailyRevenue.findOne({ businessDate, source: "Cafeteria" });
    if (existing) {
      console.log(`[CRON] Cafeteria revenue for ${businessDate} already processed. Skipping.`);
      return;
    }

    // 2. Calculate TOTAL paid amount across ALL cafeteria transactions in history
    const allTransactions = await CafeteriaTransaction.find({});
    const totalPaidEver = allTransactions.reduce((sum, tx) => sum + (tx.paidAmount || 0), 0);

    // 3. Calculate TOTAL amount already processed by this cron job in history
    const pastRevenues = await CafeteriaDailyRevenue.find({ source: "Cafeteria" });
    const totalProcessedEver = pastRevenues.reduce((sum, rev) => sum + (rev.totalCollectedAmount || 0), 0);

    // 4. Today's collected amount is the delta
    let todaysRevenue = totalPaidEver - totalProcessedEver;
    
    // Safety check - if negative due to manual DB edits, just record 0 to prevent issues
    if (todaysRevenue < 0) {
        console.warn(`[CRON] Warning: Calculated negative revenue (${todaysRevenue}) for Cafeteria on ${businessDate}. Defaulting to 0.`);
        todaysRevenue = 0;
    }

    // If today's revenue is 0 and there are no transactions, we can still post a 0 record just to mark it done,
    // or we can skip. Creating the record is better to prevent duplicate runs from trying again.
    
    // 5. Ensure "Cafeteria Sales" Income Category exists
    let category = await IncomeCategory.findOne({ name: { $regex: /cafeteria/i } });
    if (!category) {
      category = await IncomeCategory.findOne({ name: { $regex: /food/i } });
    }
    if (!category) {
      category = await IncomeCategory.findOne({ name: { $regex: /sales/i } });
    }
    if (!category) {
      // Create it
      category = await IncomeCategory.create({
        name: "Cafeteria Sales",
        description: "Revenue from Cafeteria"
      });
    }

    // 6. Create the Income Record
    const incomeRecord = await Income.create({
      title: "Today Cafeteria",
      description: `Cafeteria revenue collected for ${businessDate}`,
      amount: todaysRevenue,
      category: category._id,
      type: "income",
      paymentMethod: "cash", // Assume mixed or default to cash
      date: new Date(),
    });

    // 7. Save the Daily Revenue Record
    await CafeteriaDailyRevenue.create({
      businessDate,
      source: "Cafeteria",
      description: "Today Cafeteria",
      totalCollectedAmount: todaysRevenue,
      incomeRecordId: incomeRecord._id,
      processedAt: new Date(),
    });

    console.log(`[CRON] Successfully processed Cafeteria Revenue for ${businessDate}: ₹${todaysRevenue}`);
  } catch (error) {
    // If there's a duplicate key error (11000) on CafeteriaDailyRevenue, it means another instance ran at the same time.
    if (error.code === 11000) {
       console.log(`[CRON] Race condition caught: Cafeteria revenue for this date already processed.`);
    } else {
       console.error(`[CRON] Failed to process daily Cafeteria revenue:`, error);
    }
  }
};

// Schedule it to run daily at 10:30 PM (22:30)
// The timezone is set to Asia/Kolkata as the business operates in IST
export const initCafeteriaRevenueCron = () => {
  cron.schedule("30 22 * * *", () => {
    console.log(`[CRON] Running daily Cafeteria Revenue job at ${new Date().toLocaleString()}`);
    processDailyCafeteriaRevenue();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
  console.log("✅ Cafeteria Revenue Cron Job initialized (Scheduled at 10:30 PM IST).");
};
