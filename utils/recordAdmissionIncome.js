import { Income } from "../models/Income.js";
import { IncomeCategory } from "../models/IncomeCategory.js";

const ADMISSION_CATEGORY_NAME = "Admission";

// Finds the "Admission" income category, creating it if it doesn't exist yet.
async function getOrCreateAdmissionCategory() {
  let category = await IncomeCategory.findOne({ name: ADMISSION_CATEGORY_NAME });
  if (!category) {
    category = await IncomeCategory.create({
      name: ADMISSION_CATEGORY_NAME,
      description: "Auto-created for member registration/renewal payments",
      color: "#10b981",
    });
  }
  return category;
}

// Records the actual amount collected from a member payment as an Income
// entry under the "Admission" category. Best-effort: failures are logged,
// not thrown, so they never block the payment flow itself.
export async function recordAdmissionIncome({ amountPaid, memberName, invoiceNo, paymentMode, date, createdBy }) {
  if (!amountPaid || amountPaid <= 0) return null;
  try {
    const category = await getOrCreateAdmissionCategory();
    return await Income.create({
      title: `Admission payment - ${memberName}`,
      description: invoiceNo ? `Invoice ${invoiceNo}` : "",
      amount: amountPaid,
      category: category._id,
      type: "income",
      paymentMethod: paymentMode || "cash",
      date: date || new Date(),
      createdBy,
    });
  } catch (err) {
    console.error("Failed to record admission income:", err);
    return null;
  }
}
