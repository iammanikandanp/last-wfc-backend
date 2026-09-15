import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RegPayment } from './models/RegPayment.js';
import { Counter } from './models/Counter.js';

dotenv.config();

const migrate = async () => {
  try {
    const dbUrl = process.env.DB || 'mongodb+srv://vijayr1321_db_user:bG2BL5pU9RlQZ2gb@cluster0.axoxjuf.mongodb.net/wfc?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(dbUrl);
    console.log('Connected to MongoDB');

    const aug1 = new Date('2026-08-01T00:00:00.000Z');
    
    // Find all records from August 1, 2026 onwards, sorted by creation date
    const payments = await RegPayment.find({ createdAt: { $gte: aug1 } }).sort({ createdAt: 1 });
    console.log(`Found ${payments.length} RegPayment records from August 1, 2026 onwards.`);

    if (payments.length === 0) {
      console.log('No records to migrate.');
      process.exit(0);
    }

    let seqNum = 1;
    for (const payment of payments) {
      const newInvoiceNo = String(seqNum);
      if (payment.invoiceNo !== newInvoiceNo) {
        await RegPayment.updateOne({ _id: payment._id }, { $set: { invoiceNo: newInvoiceNo } });
        console.log(`Updated RegPayment ${payment._id} -> invoiceNo: ${newInvoiceNo}`);
      }
      seqNum++;
    }

    const finalSeq = seqNum - 1;
    // Update the counter to the latest assigned number
    await Counter.findOneAndUpdate(
      { id: 'invoiceNo' },
      { $set: { seq: finalSeq } },
      { upsert: true }
    );
    console.log(`Counter updated successfully to: ${finalSeq}`);

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
