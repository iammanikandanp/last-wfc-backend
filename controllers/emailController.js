// controllers/emailController.js
import nodemailer from "nodemailer";
import { RegPayment } from "../models/RegPayment.js";
import dotenv from "dotenv";
dotenv.config();

const GYM_NAME  = "WFC – Wolverine Fitness Club";
const GYM_CITY  = "Coimbatore";
const GYM_EMAIL = process.env.EMAIL_USER || "wfcwolverinefitness@gmail.com";

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: { user: GYM_EMAIL, pass: process.env.EMAIL_PASS },
  });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtAmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

// ── Build HTML ────────────────────────────────────────────────────────────────
const buildHTML = ({ memberName, invoiceNo, packageName, finalAmount, balanceAmount=0,
                     paymentMode, startDate, endDate, pdfUrl, isReminder }) => {

  const hdrBg = isReminder
    ? "background:linear-gradient(135deg,#b45309 0%,#78350f 100%);"
    : "background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);";

  const amtBox = balanceAmount > 0
    ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;
                   padding:16px 20px;margin-bottom:20px;text-align:center;">
         <p style="font-size:13px;color:#991b1b;font-weight:700;margin:0 0 4px;">⚠️ Balance Due</p>
         <p style="font-size:30px;font-weight:900;color:#dc2626;margin:0;">${fmtAmt(balanceAmount)}</p>
         <p style="font-size:12px;color:#b91c1c;margin:4px 0 0;">Pay at front desk · Cash / UPI / Card</p>
       </div>`
    : `<div style="background:#dcfce7;border:1px solid #86efac;border-radius:12px;
                   padding:16px 20px;margin-bottom:20px;text-align:center;">
         <p style="font-size:13px;color:#166534;font-weight:700;margin:0 0 2px;">✅ Payment Confirmed</p>
         <p style="font-size:30px;font-weight:900;color:#16a34a;margin:0;">${fmtAmt(finalAmount)}</p>
         <p style="font-size:12px;color:#15803d;margin:4px 0 0;">${(paymentMode||"").toUpperCase()}</p>
       </div>`;

  const pdfBtn = pdfUrl
    ? `<div style="text-align:center;margin:20px 0;">
         <a href="${pdfUrl}" style="display:inline-block;background:#dc2626;color:#fff;
            text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:700;font-size:14px;">
           📄 View / Download Invoice
         </a>
         <p style="font-size:11px;color:#94a3b8;margin:6px 0 0;">Click above to open your invoice PDF</p>
       </div>`
    : `<div style="background:#fef9c3;border:1px solid #fde68a;border-radius:10px;
                   padding:12px 16px;margin:16px 0;text-align:center;">
         <p style="font-size:12px;color:#92400e;margin:0;">
           ℹ️ Invoice PDF is being processed. Please contact the front desk for a copy.
         </p>
       </div>`;

  const rows = [
    ["Package : ",     packageName || "—"],
    ["Invoice No : ",  invoiceNo   || "—"],
    ["Start Date : ",  fmtDate(startDate)],
    ["End Date : ",    fmtDate(endDate)],
    ["Payment Mode : ",(paymentMode||"").toUpperCase()],
  ].map(([l,v]) => `
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9;">
      <span style="font-size:13px;color:#64748b;">${l}</span>
      <span style="font-size:13px;font-weight:600;color:#1e293b;">${v}</span>
    </div>`).join("");

  const reminderNote = isReminder
    ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;
                   padding:14px 16px;margin-bottom:20px;">
         <p style="font-size:13px;color:#92400e;margin:0;">
           Kindly clear the balance at your earliest convenience to keep your membership active.
           You can pay at the front desk or contact us for assistance.
         </p>
       </div>` : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

  <div style="${hdrBg}color:#fff;padding:32px 28px 24px;text-align:center;">
    <div style="font-size:36px;margin-bottom:8px;">💪</div>
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;">${GYM_NAME}</h1>
    <p style="margin:0;font-size:12px;color:#94a3b8;">${isReminder ? "Balance Reminder" : "Payment Receipt"}</p>
    <span style="display:inline-block;margin-top:12px;background:rgba(255,255,255,.15);
                 color:#fff;font-size:11px;font-weight:700;padding:4px 14px;border-radius:999px;">
      Invoice #${invoiceNo || "—"}
    </span>
  </div>

  <div style="padding:28px;">
    <p style="font-size:16px;font-weight:600;color:#1e293b;margin:0 0 4px;">Hello ${memberName || "Member"} 👋</p>
    <p style="font-size:13px;color:#64748b;margin:0 0 20px;">
      ${isReminder
        ? "We hope you are enjoying your fitness journey at " + GYM_NAME + "! This is a friendly reminder about your pending balance."
        : "Thank you for your payment! Here is your membership receipt."}
    </p>

    ${amtBox}

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
      <p style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">
        Membership Details
      </p>
      ${rows}
    </div>

    ${pdfBtn}
    ${reminderNote}

    <p style="font-size:13px;color:#64748b;margin:0;">
      We look forward to seeing you continue your fitness journey! 💪<br>
      <strong style="color:#475569;">Warm regards, ${GYM_NAME}</strong>
    </p>
  </div>

  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 28px;text-align:center;">
    <p style="font-size:13px;font-weight:700;color:#475569;margin:0 0 4px;">${GYM_NAME}</p>
    <p style="font-size:12px;color:#94a3b8;margin:0;">📍 ${GYM_CITY} &nbsp;·&nbsp; ✉️ ${GYM_EMAIL}</p>
    <p style="font-size:11px;color:#cbd5e1;margin:12px 0 0;">
      This is an automated message. Please ignore if payment has already been made.
    </p>
  </div>
</div>
</body></html>`;
};

// ── POST /api/v1/send-email ───────────────────────────────────────────────────
export const sendInvoiceEmail = async (req, res) => {
  try {
    const {
      to, memberName, invoiceNo,
      amount, finalAmount, balanceAmount = 0,
      packageName, startDate, endDate,
      paymentMode, pdfUrl: clientPdfUrl,
      isReminder = false,
    } = req.body;

    if (!to) return res.status(400).json({ success: false, message: "to (email) is required" });

    // ── Check DB for pdfUrl if client didn't send one ─────────────────────────
    let pdfUrl = clientPdfUrl || "";

    if (!pdfUrl && invoiceNo) {
      try {
        const pay = await RegPayment.findOne({ invoiceNo }).select("pdfUrl");
        if (pay?.pdfUrl) {
          pdfUrl = pay.pdfUrl;
          console.log("✅ Found PDF URL in DB:", pdfUrl);
        } else {
          console.log("⚠️  No pdfUrl in DB for invoice:", invoiceNo, "— email will omit PDF button");
        }
      } catch (dbErr) {
        console.warn("DB lookup failed:", dbErr.message);
      }
    }

    const transporter = createTransporter();
    await transporter.verify();

    const subject = isReminder
      ? `⚠️ Balance Reminder – ${GYM_NAME} | Due: ${fmtAmt(balanceAmount)}`
      : `✅ Payment Confirmed – ${GYM_NAME} | ${fmtAmt(finalAmount || amount)}`;

    const info = await transporter.sendMail({
      from:    `"${GYM_NAME}" <${GYM_EMAIL}>`,
      to,
      subject,
      html:    buildHTML({
        memberName, invoiceNo, packageName,
        finalAmount: finalAmount || amount,
        balanceAmount, paymentMode,
        startDate, endDate, pdfUrl, isReminder,
      }),
    });

    console.log("📧 Email sent:", info.messageId, "→", to, "| pdfUrl:", pdfUrl ? "included" : "none");

    return res.status(200).json({
      success:     true,
      message:     `Email sent to ${to}`,
      messageId:   info.messageId,
      pdfIncluded: !!pdfUrl,
    });

  } catch (err) {
    console.error("Email error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
      hint: err.code === "EAUTH"
        ? "Gmail auth failed. Set EMAIL_USER + EMAIL_PASS (App Password) in Render env vars."
        : "Check server logs.",
    });
  }
};