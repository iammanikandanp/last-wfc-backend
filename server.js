import express from "express";
import dotenv from "dotenv";
import connectDb from "./database/db.js";
import router from "./routers/apiRoutes.js";
import cors from "cors";
dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:5000"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
}));

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "WFC Backend running ✅" });
});

app.use("/api/v1", router);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  connectDb();
});