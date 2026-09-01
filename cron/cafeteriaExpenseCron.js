import cron from "node-cron";
import { CafeteriaStockRefill } from "../models/CafeteriaStockRefill.js";
import { Expense } from "../models/Expense.js";
import { ExpenseCategory } from "../models/ExpenseCategory.js";

const getLocalDateString = (dateObj) => {
  const opts = { timeZone: "Asia/Kolkata", year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', opts);
  return formatter.format(dateObj); // Returns YYYY-MM-DD
};

export const processDailyCafeteriaExpense = async (targetDateStr = null) => {
  try {
    const businessDate = targetDateStr || getLocalDateString(new Date());

    // Find all unposted refills from today (or earlier, we just want to post all unposted ones)
    // To be precise for "today's total", we can just fetch all unposted ones since the cron runs daily.
    const unpostedRefills = await CafeteriaStockRefill.find({ expensePosted: false });
    
    if (unpostedRefills.length === 0) {
      console.log(`[CRON] No unposted cafeteria refills found for ${businessDate}. Skipping.`);
      return;
    }

    const totalExpense = unpostedRefills.reduce((sum, refill) => sum + (refill.totalRefillAmount || 0), 0);

    if (totalExpense <= 0) {
      console.log(`[CRON] Total unposted refill amount is 0. Marking as posted. ${businessDate}`);
      await CafeteriaStockRefill.updateMany(
        { _id: { $in: unpostedRefills.map(r => r._id) } },
        { $set: { expensePosted: true } }
      );
      return;
    }

    // Ensure "Cafeteria" Expense Category exists
    let category = await ExpenseCategory.findOne({ name: { $regex: /cafeteria/i } });
    if (!category) {
      category = await ExpenseCategory.create({
        name: "Cafeteria",
        description: "Cafeteria stock and related expenses"
      });
    }

    // Create ONE single expense record
    await Expense.create({
      title: "Cafeteria Stock Refill",
      description: `Daily consolidated cafeteria stock refill expense for ${businessDate}`,
      amount: totalExpense,
      category: category._id,
      paymentMethod: "cash",
      date: new Date(),
    });

    // Mark as posted
    await CafeteriaStockRefill.updateMany(
      { _id: { $in: unpostedRefills.map(r => r._id) } },
      { $set: { expensePosted: true } }
    );

    console.log(`[CRON] Successfully processed Cafeteria Refill Expense for ${businessDate}: ₹${totalExpense}`);
  } catch (error) {
    console.error(`[CRON] Failed to process daily Cafeteria refill expense:`, error);
  }
};

export const initCafeteriaExpenseCron = () => {
  cron.schedule("30 22 * * *", () => {
    console.log(`[CRON] Running daily Cafeteria Expense job at ${new Date().toLocaleString()}`);
    processDailyCafeteriaExpense();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
  console.log("✅ Cafeteria Expense Cron Job initialized (Scheduled at 10:30 PM IST).");
};
