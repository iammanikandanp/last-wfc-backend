import mongoose from "mongoose";
import { RegPayment } from "./models/RegPayment.js";
import dotenv from "dotenv";

dotenv.config();

mongoose.connect(process.env.DB).then(async () => {
  const p = await RegPayment.find({}, 'invoiceNo');
  console.log("Invoices:", p.map(x => x.invoiceNo));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
