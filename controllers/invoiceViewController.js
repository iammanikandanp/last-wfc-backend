import { RegPayment } from "../models/RegPayment.js";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const viewInvoice = async (req, res) => {
  try {
    const payment = await RegPayment.findById(req.params.id).lean();
    if (!payment) {
      return res.status(404).send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px;color:#64748b">
          <h2>Invoice not found</h2><p>This invoice link may be invalid or expired.</p>
        </body></html>`);
    }

    const {
      invoiceNo, memberName, memberPhone, memberEmail,
      package: pkg, amount, discount, finalAmount,
      paymentMode, paymentType, advanceAmount, balanceAmount,
      startDate, endDate, createdAt,
    } = payment;

    const isPartly = paymentType === "partly";
    const isPaid   = !balanceAmount || balanceAmount <= 0;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Invoice ${invoiceNo} – WFC</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; min-height: 100vh; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.12); }

    /* Header */
    .header { background: linear-gradient(135deg, #0f172a 0%, #7f1d1d 100%); color: #fff; padding: 28px 28px 22px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { font-size: 18px; font-weight: 800; letter-spacing: .5px; }
    .brand-sub { font-size: 11px; color: #94a3b8; margin-top: 3px; }
    .invoice-tag { text-align: right; }
    .invoice-tag .label { font-size: 22px; font-weight: 900; color: #fca5a5; letter-spacing: 2px; }
    .invoice-tag .no { font-size: 12px; color: #94a3b8; margin-top: 4px; font-family: monospace; }
    .divider { height: 1px; background: rgba(255,255,255,.15); margin: 16px 0 0; }

    /* Status badge */
    .status-bar { padding: 10px 28px; font-size: 12px; font-weight: 700; letter-spacing: .5px; text-align: center; }
    .status-paid { background: #dcfce7; color: #15803d; }
    .status-pending { background: #fef9c3; color: #92400e; }

    /* Body */
    .body { padding: 24px 28px; }

    /* Bill to */
    .section-title { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 8px; }
    .member-name { font-size: 20px; font-weight: 800; color: #0f172a; }
    .member-detail { font-size: 13px; color: #64748b; margin-top: 3px; }

    /* Two-col info */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
    .info-box { background: #f8fafc; border-radius: 10px; padding: 14px; }
    .info-box .title { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .info-row { display: flex; justify-content: space-between; font-size: 12px; color: #475569; padding: 3px 0; }
    .info-row span:last-child { font-weight: 600; color: #1e293b; }

    /* Line item table */
    .table { width: 100%; border-collapse: collapse; margin: 20px 0 0; border-radius: 10px; overflow: hidden; }
    .table thead tr { background: #0f172a; color: #fff; }
    .table th { padding: 10px 14px; font-size: 11px; font-weight: 700; text-align: left; }
    .table th:not(:first-child) { text-align: right; }
    .table tbody tr { background: #f8fafc; }
    .table td { padding: 14px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
    .table td:not(:first-child) { text-align: right; }
    .table .desc-main { font-weight: 700; }
    .table .desc-sub { font-size: 11px; color: #64748b; margin-top: 3px; }

    /* Totals */
    .totals { margin-top: 16px; }
    .total-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; }
    .total-row span:last-child { color: #1e293b; font-weight: 600; }
    .total-row.discount span:last-child { color: #dc2626; }
    .total-final { display: flex; justify-content: space-between; align-items: center; background: #0f172a; border-radius: 10px; padding: 14px 16px; margin-top: 10px; }
    .total-final .label { font-size: 13px; font-weight: 700; color: #fff; }
    .total-final .value { font-size: 20px; font-weight: 900; color: #fca5a5; }
    .total-paid { display: flex; justify-content: space-between; align-items: center; background: #dcfce7; border-radius: 10px; padding: 10px 16px; margin-top: 8px; }
    .total-paid .label { font-size: 12px; font-weight: 700; color: #15803d; }
    .total-paid .value { font-size: 16px; font-weight: 900; color: #15803d; }
    .total-balance { display: flex; justify-content: space-between; align-items: center; background: #fef2f2; border-radius: 10px; padding: 10px 16px; margin-top: 8px; border: 1px solid #fecaca; }
    .total-balance .label { font-size: 12px; font-weight: 700; color: #dc2626; }
    .total-balance .value { font-size: 16px; font-weight: 900; color: #dc2626; }

    /* Footer */
    .footer { border-top: 3px solid #dc2626; margin-top: 28px; padding-top: 16px; }
    .footer-msg { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
    .footer-note { font-size: 11px; color: #94a3b8; margin-top: 4px; }
    .footer-bottom { margin-top: 16px; text-align: center; font-size: 11px; color: #94a3b8; padding-bottom: 8px; }

    @media (max-width: 480px) {
      .card { border-radius: 0; }
      body { padding: 0; }
      .info-grid { grid-template-columns: 1fr; }
      .header-top { flex-direction: column; gap: 12px; }
      .invoice-tag { text-align: left; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-top">
        <div>
          <div class="brand">WFC – Wolverine Fitness Club</div>
          <div class="brand-sub">Excellence in Fitness | Coimbatore, Tamil Nadu</div>
        </div>
        <div class="invoice-tag">
          <div class="label">INVOICE</div>
          <div class="no"># ${invoiceNo}</div>
        </div>
      </div>
      <div class="divider"></div>
    </div>

    <div class="status-bar ${isPaid ? "status-paid" : "status-pending"}">
      ${isPaid ? "✅ FULLY PAID" : `⏳ ADVANCE PAID — BALANCE DUE ₹${fmt(balanceAmount)}`}
    </div>

    <div class="body">
      <div class="section-title">Bill To</div>
      <div class="member-name">${memberName || "—"}</div>
      ${memberPhone ? `<div class="member-detail">📞 ${memberPhone}</div>` : ""}
      ${memberEmail ? `<div class="member-detail">✉️ ${memberEmail}</div>` : ""}

      <div class="info-grid">
        <div class="info-box">
          <div class="title">Payment Info</div>
          <div class="info-row"><span>Invoice No</span><span>${invoiceNo}</span></div>
          <div class="info-row"><span>Date Issued</span><span>${fmtDate(createdAt)}</span></div>
          <div class="info-row"><span>Pay Mode</span><span>${(paymentMode || "").toUpperCase()}</span></div>
          <div class="info-row"><span>Pay Type</span><span>${isPartly ? "Advance" : "Full"}</span></div>
        </div>
        <div class="info-box">
          <div class="title">Membership Period</div>
          <div class="info-row"><span>Package</span><span>${pkg || "—"}</span></div>
          <div class="info-row"><span>Start</span><span>${fmtDate(startDate)}</span></div>
          <div class="info-row"><span>End</span><span>${fmtDate(endDate)}</span></div>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="desc-main">${pkg || "—"} Membership</div>
              <div class="desc-sub">${fmtDate(startDate)} – ${fmtDate(endDate)}</div>
              <div class="desc-sub">Mode: ${(paymentMode || "").toUpperCase()}</div>
            </td>
            <td>1</td>
            <td>₹${fmt(amount)}</td>
            <td>₹${fmt(amount)}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row"><span>Subtotal</span><span>₹${fmt(amount)}</span></div>
        ${discount > 0 ? `<div class="total-row discount"><span>Discount</span><span>– ₹${fmt(discount)}</span></div>` : ""}
        <div class="total-final">
          <span class="label">Total Payable</span>
          <span class="value">₹${fmt(finalAmount)}</span>
        </div>
        ${isPartly ? `
        <div class="total-paid">
          <span class="label">⚡ Advance Paid</span>
          <span class="value">₹${fmt(advanceAmount)}</span>
        </div>
        <div class="total-balance">
          <span class="label">⏳ Balance Due</span>
          <span class="value">₹${fmt(balanceAmount)}</span>
        </div>` : ""}
      </div>

      <div class="footer">
        <div class="footer-msg">Thank you for your business!</div>
        <div class="footer-note">• Please retain this invoice for your records.</div>
        <div class="footer-note">• For queries: support@wolverinefitnessclub.com</div>
        <div class="footer-note">• Computer-generated invoice — no physical signature required.</div>
      </div>
    </div>

    <div class="footer-bottom">
      WFC – Wolverine Fitness Club, Coimbatore &nbsp;|&nbsp; Generated on ${fmtDate(new Date())}
    </div>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(html);
  } catch (err) {
    console.error("viewInvoice error:", err);
    return res.status(500).send("<html><body>Server error</body></html>");
  }
};
