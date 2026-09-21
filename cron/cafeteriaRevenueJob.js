import cron from "node-cron";
import { CafeteriaTransaction } from "../models/CafeteriaTransaction.js";
import { CafeteriaDailyRevenue } from "../models/CafeteriaDailyRevenue.js";
import { Income } from "../models/Income.js";
import { IncomeCategory } from "../models/IncomeCategory.js";

export const getLocalDateString = (dateObj) => {
  const opts = { timeZone: "Asia/Kolkata", year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', opts);
  return formatter.format(dateObj); // Returns YYYY-MM-DD
};

export const processDailyCafeteriaRevenue = async (targetDateStr = null) => {
  try {
    let businessDate;
    if (targetDateStr instanceof Date) {
        businessDate = getLocalDateString(targetDateStr);
    } else {
        businessDate = targetDateStr || getLocalDateString(new Date());
    }

    // 1. Calculate TOTAL collected amount for this specific date
    const startOfDay = new Date(businessDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(businessDate);
    endOfDay.setHours(23, 59, 59, 999);

    const txAggregation = await CafeteriaTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$paidAmount" },
          totalPrevUsed: { $sum: "$previousBalanceUsed" }
        }
      }
    ]);
    
    let todaysRevenue = 0;
    if (txAggregation.length > 0) {
      const { totalPaid = 0, totalPrevUsed = 0 } = txAggregation[0];
      todaysRevenue = totalPaid - totalPrevUsed;
    }

    if (todaysRevenue < 0) {
        console.warn(`[CRON] Warning: Calculated negative revenue (${todaysRevenue}) for Cafeteria on ${businessDate}. Defaulting to 0.`);
        todaysRevenue = 0;
    }

    // 2. Ensure "Cafeteria Sales" Income Category exists
    let category = await IncomeCategory.findOne({ name: { $regex: /cafeteria/i } });
    if (!category) {
      category = await IncomeCategory.findOne({ name: { $regex: /food/i } });
    }
    if (!category) {
      category = await IncomeCategory.findOne({ name: { $regex: /sales/i } });
    }
    if (!category) {
      category = await IncomeCategory.create({
        name: "Cafeteria Sales",
        description: "Revenue from Cafeteria"
      });
    }

    // 3. Check if we already processed for this businessDate
    let existing = await CafeteriaDailyRevenue.findOne({ businessDate, source: "Cafeteria" });
    
    if (existing) {
      // Update existing income record
      const incomeRecord = await Income.findById(existing.incomeRecordId);
      if (incomeRecord) {
        incomeRecord.amount = todaysRevenue;
        incomeRecord.date = startOfDay; // Ensure it aligns with transactionDate for Expenses filters
        await incomeRecord.save();
      } else {
        // If it was manually deleted from Income, recreate it
        const newIncomeRecord = await Income.create({
          title: "Today Cafeteria",
          description: `Cafeteria revenue collected for ${businessDate}`,
          amount: todaysRevenue,
          category: category._id,
          type: "income",
          paymentMethod: "cash",
          date: startOfDay,
        });
        existing.incomeRecordId = newIncomeRecord._id;
      }
      
      existing.totalCollectedAmount = todaysRevenue;
      existing.processedAt = new Date();
      await existing.save();
      console.log(`[SYNC] Updated Cafeteria Revenue for ${businessDate}: ₹${todaysRevenue}`);
    } else {
      // Create new income record
      const incomeRecord = await Income.create({
        title: "Today Cafeteria",
        description: `Cafeteria revenue collected for ${businessDate}`,
        amount: todaysRevenue,
        category: category._id,
        type: "income",
        paymentMethod: "cash",
        date: startOfDay,
      });

      await CafeteriaDailyRevenue.create({
        businessDate,
        source: "Cafeteria",
        description: "Today Cafeteria",
        totalCollectedAmount: todaysRevenue,
        incomeRecordId: incomeRecord._id,
        processedAt: new Date(),
      });
      console.log(`[SYNC] Created Cafeteria Revenue for ${businessDate}: ₹${todaysRevenue}`);
    }

  } catch (error) {
    if (error.code === 11000) {
       console.log(`[SYNC] Race condition caught: Cafeteria revenue for this date already processed.`);
    } else {
       console.error(`[SYNC] Failed to process daily Cafeteria revenue:`, error);
    }
  }
};

// Schedule it to run daily at 10:30 PM (22:30)
// The timezone is set to Asia/Kolkata as the business operates in IST
export const initCafeteriaRevenueCron = () => {
  cron.schedule("20 23 * * *", () => {
    console.log(`[CRON] Running daily Cafeteria Revenue job at ${new Date().toLocaleString()}`);
    processDailyCafeteriaRevenue();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
  console.log("✅ Cafeteria Revenue Cron Job initialized (Scheduled at 11:20 PM IST).");
};
