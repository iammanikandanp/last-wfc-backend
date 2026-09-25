import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

dns.setServers(['8.8.8.8', '1.1.1.1']);

import { Registration } from '../models/registration.js';
import { User } from '../models/User.js';

async function migrate() {
  try {
    await mongoose.connect(process.env.DB);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const rawMembers = await db.collection('registras').find({}).toArray();
    console.log(`Total members found: ${rawMembers.length}`);

    let dobFoundCount = 0;
    let dobMigratedCount = 0;
    let dobMissingCount = 0;
    let alreadyMigratedCount = 0;
    let errorsCount = 0;

    for (const doc of rawMembers) {
      let foundDob = null;

      // Extract all keys including nested
      const allKeys = [];
      Object.keys(doc).forEach(key => {
        allKeys.push(key);
        if (typeof doc[key] === 'object' && doc[key] !== null && !Array.isArray(doc[key]) && !(doc[key] instanceof Date)) {
          Object.keys(doc[key]).forEach(nk => allKeys.push(`${key}.${nk}`));
        }
      });

      for (const field of allKeys) {
        const k = field.toLowerCase();
        if (k.includes('dob') || k.includes('date_of_birth') || k.includes('birthdate') || k.includes('birth_date') || k.includes('birthdate')) {
          const parts = field.split('.');
          const val = parts.length === 1 ? doc[parts[0]] : doc[parts[0]][parts[1]];
          if (val) {
            foundDob = val;
            break;
          }
        }
      }

      // If not in standard old fields, let's also check if it's already in dateOfBirth and migrated
      if (foundDob) {
        dobFoundCount++;
      } else if (doc.dateOfBirth) {
        alreadyMigratedCount++;
        continue;
      } else {
        dobMissingCount++;
        console.log(`DOB missing:\n- Member ID: ${doc._id}\n- Name: ${doc.name}`);
        continue;
      }

      if (foundDob) {
        try {
          // Normalize formatting to DD/MM/YYYY
          let normalizedDOB = foundDob;
          if (foundDob.includes('-')) {
            const parts = foundDob.split('-');
            if (parts.length === 3 && parts[0].length === 4) { // YYYY-MM-DD
              normalizedDOB = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else if (parts.length === 3 && parts[2].length === 4) { // DD-MM-YYYY
              normalizedDOB = `${parts[0]}/${parts[1]}/${parts[2]}`;
            }
          }

          // Generate hash for password
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(normalizedDOB, salt);

          // Get mongoose doc to save correctly and trigger middleware/validation
          const member = await Registration.findById(doc._id);
          if (member) {
            member.dateOfBirth = normalizedDOB;
            member.password = passwordHash;
            
            await member.save();
            dobMigratedCount++;
          }
        } catch (err) {
          errorsCount++;
          console.error(`Failed to migrate member ${doc._id}:`, err);
        }
      }
    }

    console.log('\nMigration Summary:');
    console.log(`Total members found: ${rawMembers.length}`);
    console.log(`DOB found: ${dobFoundCount}`);
    console.log(`DOB migrated: ${dobMigratedCount}`);
    console.log(`DOB missing: ${dobMissingCount}`);
    console.log(`Already migrated: ${alreadyMigratedCount}`);
    console.log(`Errors: ${errorsCount}`);

  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    mongoose.connection.close();
  }
}

migrate();
