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

app.get('/api/migrate-progress', async (req, res) => {
  try {
    const { Registration } = await import('./models/registration.js');
    const { MemberProgress } = await import('./models/MemberProgress.js');
    const { ProgressPhotoSession } = await import('./models/ProgressPhotoSession.js');
    
    const members = await Registration.find({});
    
    let progressMigrated = 0;
    let photoMigrated = 0;

    for (const member of members) {
      // Migrate measurements
      if (member.height || member.weight || member.bmi || member.bodyFat) {
        const existingProgress = await MemberProgress.findOne({ registration: member._id });
        if (!existingProgress) {
          // ensure numbers for schema
          const toNum = v => {
             if (v === undefined || v === null || v === "") return undefined;
             const n = Number(v);
             return isNaN(n) ? undefined : n;
          };
          await MemberProgress.create({
            registration: member._id,
            date: member.startDate || member.createdAt || new Date(),
            weight: toNum(member.weight),
            height: toNum(member.height),
            waist: toNum(member.waist),
            hip: toNum(member.hip),
            neck: toNum(member.neck),
            bodyFat: toNum(member.bodyFat),
            bmi: toNum(member.bmi),
            notes: "Legacy migrated data",
          });
          progressMigrated++;
        }
      }

      // Migrate photos
      if (member.images && (member.images.frontBodyImage || member.images.sideBodyImage || member.images.backBodyImage)) {
        const existingSession = await ProgressPhotoSession.findOne({ registration: member._id });
        if (!existingSession) {
          await ProgressPhotoSession.create({
            registration: member._id,
            date: member.startDate || member.createdAt || new Date(),
            frontImage: member.images.frontBodyImage || "",
            sideImage: member.images.sideBodyImage || "",
            backImage: member.images.backBodyImage || "",
            notes: "Legacy migrated photos",
          });
          photoMigrated++;
        }
      }
    }

    res.json({ success: true, progressMigrated, photoMigrated, totalMembers: members.length });
  } catch (e) {
    res.json({ error: e.message, stack: e.stack });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  connectDb();
  initCafeteriaRevenueCron();
  initCafeteriaExpenseCron();
});