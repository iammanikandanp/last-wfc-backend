import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  try {
    await mongoose.connect(process.env.DB);
    const adminDb = mongoose.connection.client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('Databases:', dbs.databases.map(db => db.name));
    
    for (const dbInfo of dbs.databases) {
      if (dbInfo.name === 'admin' || dbInfo.name === 'local') continue;
      const db = mongoose.connection.client.db(dbInfo.name);
      const cols = await db.listCollections().toArray();
      console.log(`\nDB: ${dbInfo.name}`);
      console.log('Collections:', cols.map(c => c.name));
      if (cols.find(c => c.name === 'registras' || c.name === 'members' || c.name === 'users')) {
        const mems = await db.collection('registras').countDocuments();
        console.log('registras count:', mems);
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

main();
