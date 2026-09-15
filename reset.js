import mongoose from 'mongoose';
import { Counter } from './models/Counter.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.DB || 'mongodb+srv://vijayr1321_db_user:bG2BL5pU9RlQZ2gb@cluster0.axoxjuf.mongodb.net/wfc?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    await Counter.findOneAndUpdate(
      { id: 'invoiceNo' },
      { $set: { seq: 0 } },
      { upsert: true }
    );
    console.log('Reset counter to 0');
    process.exit(0);
  })
  .catch(console.error);
