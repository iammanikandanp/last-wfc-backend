import express from "express";
import dotenv from "dotenv";
import connectDb from "./database/db.js";
import router from "./routers/apiRoutes.js";
import cors from "cors";
import { initCafeteriaRevenueCron } from "./cron/cafeteriaRevenueJob.js";
import { initCafeteriaExpenseCron } from "./cron/cafeteriaExpenseCron.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:5000",
    /\.vercel\.app$/,
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
}));

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "WFC Backend running ✅" });
});

app.use("/api/v1", router);

app.get('/api/migrate-production', async (req, res) => {
  try {
    const { RegPayment } = await import('./models/RegPayment.js');
    const { Counter } = await import('./models/Counter.js');
    const aug1 = new Date('2026-08-01T00:00:00.000Z');
    
    const payments = await RegPayment.find({ createdAt: { $gte: aug1 } }).sort({ createdAt: 1 });
    
    if (payments.length === 0) {
      return res.json({ message: 'No records to migrate on production' });
    }

    // Pass 1: Rename to temporary unique strings to avoid index collisions
    for (const payment of payments) {
      await RegPayment.updateOne({ _id: payment._id }, { $set: { invoiceNo: `TEMP-${payment._id}` } });
    }

    // Pass 2: Apply sequential formatted numbers
    let seqNum = 1;
    let updatedCount = 0;
    for (const payment of payments) {
      const formatted = `WFC-INV-${String(seqNum).padStart(4, '0')}`;
      await RegPayment.updateOne({ _id: payment._id }, { $set: { invoiceNo: formatted } });
      updatedCount++;
      seqNum++;
    }

    const finalSeq = seqNum - 1;
    await Counter.findOneAndUpdate(
      { id: 'invoiceNo' },
      { $set: { seq: finalSeq } },
      { upsert: true }
    );
    
    res.json({ success: true, updatedCount, totalRecords: payments.length, finalSeq });
  } catch (e) {
    res.json({ error: e.message });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  connectDb();
  initCafeteriaRevenueCron();
  initCafeteriaExpenseCron();
});