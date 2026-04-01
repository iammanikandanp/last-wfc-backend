import { Invoice } from "../models/Invoice.js";
import { Payment } from "../models/Payment.js";
import { Member } from "../models/Member.js";

// Get invoice by ID
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("memberId")
      .populate("paymentId");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get invoice by invoice number
export const getInvoiceByNumber = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ invoiceNumber: req.params.invoiceNumber })
      .populate("memberId")
      .populate("paymentId");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all invoices
export const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate("memberId", "userId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get invoices by member
export const getInvoicesByMember = async (req, res) => {
  try {
    const invoices = await Invoice.find({ memberId: req.params.memberId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Mark invoice as printed
export const markInvoicePrinted = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { isPrinted: true },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Invoice marked as printed",
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Mark invoice as sent via WhatsApp
export const markInvoiceSent = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { isSent: true },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Invoice marked as sent",
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get invoice data for PDF
export const getInvoiceData = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("memberId")
      .populate("paymentId");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    const data = {
      gymName: "WFC – Wolverine Fitness Club",
      gymLogo: "/logo.png",
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.paymentDate,
      memberName: invoice.memberName,
      memberEmail: invoice.memberEmail,
      memberPhone: invoice.memberPhone,
      planName: invoice.planName,
      amount: invoice.amount,
      paymentMode: invoice.paymentMode,
      startDate: invoice.startDate,
      endDate: invoice.endDate,
      notes: invoice.notes,
    };

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
