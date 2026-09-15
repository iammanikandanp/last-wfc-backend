import mongoose from "mongoose";
import { Registration } from "../models/registration.js";
import { HealthRecord } from "../models/HealthRecord.js";
import { MemberProgress } from "../models/MemberProgress.js";
import { WeightHistory } from "../models/WeightHistory.js";
import { ProgressPhotoSession } from "../models/ProgressPhotoSession.js";

export const migrateInitialRecords = async () => {
  try {
    console.log("[Migration] Starting initial records migration...");
    const members = await Registration.find({});
    let migratedCount = 0;

    for (const member of members) {
      const regId = member._id;
      const date = member.startDate || member.createdAt;

      // 1. Health Record
      if (member.bloodPressure || member.sugarLevel) {
        const existingHR = await HealthRecord.findOne({ registration: regId, isInitial: true });
        if (!existingHR) {
          let systolic, diastolic;
          if (member.bloodPressure && typeof member.bloodPressure === 'string') {
            const m = member.bloodPressure.match(/(\d{2,3})\s*\/?\s*(\d{2,3})?/);
            if (m) { systolic = Number(m[1]); diastolic = m[2] ? Number(m[2]) : undefined; }
          }
          await HealthRecord.create({
            registration: regId,
            bloodPressure: member.bloodPressure || undefined,
            systolic,
            diastolic,
            sugarLevel: member.sugarLevel !== undefined && member.sugarLevel !== '' ? Number(member.sugarLevel) : undefined,
            date: date,
            time: "00:00",
            isInitial: true
          });
          migratedCount++;
        }
      }

      // 2. Member Progress (Measurements)
      if (member.height || member.weight || member.bmi || member.bodyFat) {
        const existingMP = await MemberProgress.findOne({ registration: regId, isInitial: true });
        if (!existingMP) {
          await MemberProgress.create({
            registration: regId,
            date: date,
            weight: member.weight ? Number(member.weight) : undefined,
            height: member.height ? Number(member.height) : undefined,
            waist: member.waist ? Number(member.waist) : undefined,
            hip: member.hip ? Number(member.hip) : undefined,
            neck: member.neck ? Number(member.neck) : undefined,
            bodyFat: member.bodyFat ? Number(member.bodyFat) : undefined,
            bmi: member.bmi ? Number(member.bmi) : undefined,
            notes: "Initial measurements from admission",
            isInitial: true
          });
          migratedCount++;
        }
      }

      // 3. Weight History
      if (member.weight) {
        const existingWH = await WeightHistory.findOne({ registrationId: regId, isInitial: true });
        if (!existingWH) {
          await WeightHistory.create({
            registrationId: regId,
            memberName: member.name,
            weight: Number(member.weight),
            recordDate: date,
            recordTime: "00:00",
            notes: "Initial weight from admission",
            recordType: "initial",
            isInitial: true
          });
          migratedCount++;
        }
      }

      // 4. Progress Photos
      if (member.images && (member.images.frontBodyImage || member.images.sideBodyImage || member.images.backBodyImage)) {
        const existingPPS = await ProgressPhotoSession.findOne({ registration: regId, isInitial: true });
        if (!existingPPS) {
          await ProgressPhotoSession.create({
            registration: regId,
            date: date,
            frontImage: member.images.frontBodyImage || "",
            sideImage: member.images.sideBodyImage || "",
            backImage: member.images.backBodyImage || "",
            notes: "Initial progress photos from admission",
            isInitial: true
          });
          migratedCount++;
        }
      }
    }

    console.log(`[Migration] Finished. Created ${migratedCount} initial records.`);
  } catch (error) {
    console.error("[Migration] Error during migration:", error);
  }
};
