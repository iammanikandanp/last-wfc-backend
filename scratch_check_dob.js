import mongoose from 'mongoose';

async function main() {
  await mongoose.connect('mongodb+srv://vijayr1321_db_user:bG2BL5pU9RlQZ2gb@cluster0.axoxjuf.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  const sample = await db.collection('registras').findOne({});
  console.log('Sample doc keys:', Object.keys(sample));
  
  // Find fields that might be DOB
  const allDocs = await db.collection('registras').find({}).toArray();
  const possibleFields = new Set();
  allDocs.forEach(doc => {
    Object.keys(doc).forEach(key => {
      if (key.toLowerCase().includes('dob') || key.toLowerCase().includes('date') || key.toLowerCase().includes('birth')) {
        possibleFields.add(key);
      }
    });
  });
  
  console.log('Possible DOB fields:', Array.from(possibleFields));
  
  for (const field of possibleFields) {
    const docsWithField = allDocs.filter(d => d[field] !== undefined && d[field] !== null && d[field] !== '');
    console.log(`Docs with ${field}: ${docsWithField.length}`);
    if (docsWithField.length > 0) {
      console.log(`Sample value for ${field}:`, docsWithField[0][field]);
    }
  }

  process.exit(0);
}

main().catch(console.error);
