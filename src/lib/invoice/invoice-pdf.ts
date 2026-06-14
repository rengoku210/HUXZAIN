import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { getSupabase } from "@/lib/supabase-client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  financial_year: number;
  order_id?: string;
  buyer_id?: string;
  seller_id?: string;
  gross_amount_cents: number;
  platform_fee_cents: number;
  gst_on_fee_cents: number;
  net_seller_cents: number;
  buyer_name: string;
  buyer_email: string;
  buyer_gstin?: string;
  seller_display_name: string;
  product_title: string;
  payment_method: string;
  payment_reference?: string;
  status: string;
  invoice_pdf_url?: string;
  pdf_hash?: string;
  source: string;
  manual_customer_name?: string;
  manual_customer_email?: string;
  manual_notes?: string;
  custom_fields?: any;
  voided_at?: string;
  voided_reason?: string;
  voided_by?: string;
  invoice_date: string;
  generated_at: string;
}

export interface TemplateSnapshot {
  company_name: string;
  company_address: string;
  gst_number: string;
  support_email: string;
  support_phone: string;
  website_url: string;
  logo_url: string;
  footer_text: string;
  terms_text: string;
  primary_color: string;
  accent_color: string;
  border_style: string;
  watermark_opacity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function fmtINR(cents: number): string {
  return `INR ${(cents / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Draw a rounded rectangle (jsPDF doesn't have native roundedRect in all versions) */
function roundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: "F" | "S" | "FD"
) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PDF Generator
// ─────────────────────────────────────────────────────────────────────────────

export async function generateInvoicePDF(
  invoice: InvoiceRecord,
  templateSnapshot?: TemplateSnapshot,
  shouldUpload: boolean = true
): Promise<Blob> {
  // ── Default template ──────────────────────────────────────────────────────
  const t: TemplateSnapshot = templateSnapshot || {
    company_name: "HUXZAIN DIGITAL OUTLET",
    company_address: "Bangalore, Karnataka, India – 560001",
    gst_number: "29AAAAA0000A1Z5",
    support_email: "support@huxzain.shop",
    support_phone: "+91-80-0000-0000",
    website_url: "https://huxzain.shop",
    logo_url: "",
    footer_text:
      "Thank you for choosing HUXZAIN — your secure digital marketplace.",
    terms_text:
      "All transactions are held in escrow under HUXZAIN platform policy. This is a system-generated invoice and does not require a physical signature.",
    primary_color: "#BF9F62",
    accent_color: "#0B0C10",
    border_style: "solid",
    watermark_opacity: 0.06,
  };

  // ── Colour palette ────────────────────────────────────────────────────────
  const GOLD = hexToRgb(t.primary_color || "#BF9F62");   // gold
  const DARK = hexToRgb(t.accent_color || "#0B0C10");    // near-black
  const GREY_BG: [number, number, number] = [248, 248, 250];
  const GREY_LINE: [number, number, number] = [220, 220, 225];
  const GREY_TEXT: [number, number, number] = [110, 110, 120];
  const WHITE: [number, number, number] = [255, 255, 255];
  const GREEN: [number, number, number] = [22, 163, 74];

  // ── Page setup ────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210; // page width mm
  const PH = 297; // page height mm
  const ML = 14;  // margin left
  const MR = PW - 14; // margin right

  // ─────────────────────────────────────────────────────────────────────────
  // 1. TOP HEADER BAND — dark background with gold accent line
  // ─────────────────────────────────────────────────────────────────────────
  doc.setFillColor(DARK[0], DARK[1], DARK[2]);
  doc.rect(0, 0, PW, 38, "F");

  // Gold accent strip at bottom of header
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(0, 38, PW, 1.5, "F");

  // Company name — left side of header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text(t.company_name, ML, 16);

  // Sub-line: tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.text("SECURE DIGITAL MARKETPLACE · ESCROW-PROTECTED TRANSACTIONS", ML, 22);

  // Website on far right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text(t.website_url, MR, 16, { align: "right" });
  doc.text(t.support_email, MR, 22, { align: "right" });

  // Invoice type label — right aligned, big
  const isManual = invoice.source === "admin_manual";
  const isVoided = invoice.status === "void";
  const isB2B = !!invoice.buyer_gstin;

  const invoiceTypeLabel = isVoided
    ? "VOID INVOICE"
    : isManual
    ? "MANUAL INVOICE"
    : isB2B
    ? "TAX INVOICE (B2B)"
    : "TAX INVOICE";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.text(invoiceTypeLabel, MR, 32, { align: "right" });

  // VOIDED watermark diagonal
  if (isVoided) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(64);
    doc.setTextColor(220, 38, 38);
    doc.setGState(doc.GState({ opacity: 0.08 }));
    doc.text("VOIDED", PW / 2, PH / 2, { align: "center", angle: 45 });
    doc.setGState(doc.GState({ opacity: 1 }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. INVOICE META ROW — grey background card beneath header
  // ─────────────────────────────────────────────────────────────────────────
  doc.setFillColor(GREY_BG[0], GREY_BG[1], GREY_BG[2]);
  doc.rect(0, 40, PW, 22, "F");

  const metaY = 51;
  const metaItems: { label: string; value: string }[] = [
    { label: "INVOICE NUMBER", value: invoice.invoice_number },
    {
      label: "ISSUE DATE",
      value: fmtDate(invoice.invoice_date),
    },
    {
      label: "ORDER ID",
      value: invoice.order_id
        ? invoice.order_id.slice(0, 8).toUpperCase()
        : "N/A",
    },
    { label: "PAYMENT METHOD", value: (invoice.payment_method || "escrow").toUpperCase() },
    {
      label: "STATUS",
      value: isVoided ? "VOIDED" : "ISSUED",
    },
  ];

  const colW = PW / metaItems.length;
  metaItems.forEach((item, i) => {
    const cx = ML + i * colW;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
    doc.text(item.label, cx, metaY - 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const valueColor =
      item.label === "STATUS" && isVoided
        ? ([220, 38, 38] as [number, number, number])
        : item.label === "STATUS"
        ? GREEN
        : DARK;
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(item.value, cx, metaY);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. BILLING PARTIES — Billed To (left) + Seller Info (right)
  // ─────────────────────────────────────────────────────────────────────────
  const partiesY = 68;

  // Left box — Billed To
  doc.setFillColor(GREY_BG[0], GREY_BG[1], GREY_BG[2]);
  roundedRect(doc, ML, partiesY, 86, isB2B ? 36 : 30, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
  doc.text("BILLED TO", ML + 4, partiesY + 7);

  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(0.5);
  doc.line(ML + 4, partiesY + 9, ML + 30, partiesY + 9);

  const customerName =
    (invoice.source === "admin_manual"
      ? invoice.manual_customer_name
      : invoice.buyer_name) || "Valued Customer";
  const customerEmail =
    (invoice.source === "admin_manual"
      ? invoice.manual_customer_email
      : invoice.buyer_email) || "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.text(customerName, ML + 4, partiesY + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
  doc.text(customerEmail, ML + 4, partiesY + 22);

  if (isB2B && invoice.buyer_gstin) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text(`GSTIN: ${invoice.buyer_gstin}`, ML + 4, partiesY + 29);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
    doc.text("B2B Transaction — Input Tax Credit Eligible", ML + 4, partiesY + 35);
  }

  // Right box — Seller / Platform
  doc.setFillColor(GREY_BG[0], GREY_BG[1], GREY_BG[2]);
  roundedRect(doc, ML + 92, partiesY, 104, isB2B ? 36 : 30, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
  doc.text("MERCHANT / SELLER", ML + 96, partiesY + 7);

  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.line(ML + 96, partiesY + 9, ML + 130, partiesY + 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.text(invoice.seller_display_name || t.company_name, ML + 96, partiesY + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
  doc.text("HUXZAIN Verified Merchant", ML + 96, partiesY + 22);

  // Platform GSTIN on right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.text(`Platform GSTIN: ${t.gst_number}`, ML + 96, partiesY + 29);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. LINE ITEMS TABLE
  // ─────────────────────────────────────────────────────────────────────────
  const tableStartY = partiesY + (isB2B ? 42 : 36);

  const grossINR = invoice.gross_amount_cents / 100;
  const feeINR = invoice.platform_fee_cents / 100;
  const gstOnFeeINR = invoice.gst_on_fee_cents / 100;
  const netSellerINR = invoice.net_seller_cents / 100;

  // HSN/SAC code for digital services
  const tableBody = [
    [
      invoice.product_title || "Digital Listing / Service",
      "998314",  // HSN/SAC for digital services
      "1",
      fmtINR(invoice.gross_amount_cents),
      fmtINR(invoice.gross_amount_cents),
    ],
  ];

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: ML, right: 14 },
    head: [["Description", "HSN/SAC", "Qty", "Unit Price", "Total"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: DARK,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: DARK,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
    },
    alternateRowStyles: {
      fillColor: GREY_BG,
    },
    columnStyles: {
      0: { cellWidth: 76 },
      1: { cellWidth: 22, halign: "center" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 36, halign: "right" },
      4: { cellWidth: 38, halign: "right", fontStyle: "bold" },
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. FINANCIAL SUMMARY — right-aligned breakdown box
  // ─────────────────────────────────────────────────────────────────────────
  const summaryStartY: number = (doc as any).lastAutoTable?.finalY ?? tableStartY + 20;
  const summaryY = summaryStartY + 6;

  // Summary box — right side
  const sumBoxX = MR - 90;
  const sumBoxW = 90;

  // Determine box height based on GST
  const hasGst = gstOnFeeINR > 0;
  const feeExclGst = feeINR - gstOnFeeINR;
  const rowH = 7.5;
  const rows = hasGst ? 5 : 4; // Buyer Paid, Fee (excl GST), GST on Fee (if any), separator, Seller Receives
  const sumBoxH = rows * rowH + 10;

  doc.setFillColor(GREY_BG[0], GREY_BG[1], GREY_BG[2]);
  roundedRect(doc, sumBoxX, summaryY, sumBoxW, sumBoxH, 3, "F");

  // Gold left accent bar
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  roundedRect(doc, sumBoxX, summaryY, 2, sumBoxH, 1, "F");

  let ry = summaryY + 8;
  const lx = sumBoxX + 6;
  const rx = sumBoxX + sumBoxW - 4;

  const drawRow = (
    label: string,
    value: string,
    bold = false,
    color: [number, number, number] = DARK
  ) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
    doc.text(label, lx, ry);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(value, rx, ry, { align: "right" });
    ry += rowH;
  };

  // Row 1: Buyer Paid
  drawRow("Buyer Paid (Gross)", fmtINR(invoice.gross_amount_cents));

  // Row 2: Platform Fee
  if (hasGst) {
    drawRow(`Platform Fee (excl. GST)`, `– INR ${feeExclGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
    drawRow(`GST on Platform Fee (18%)`, `– INR ${gstOnFeeINR.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
  } else {
    drawRow("Platform Fee Deducted", `– INR ${feeINR.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
  }

  // Divider
  doc.setDrawColor(GREY_LINE[0], GREY_LINE[1], GREY_LINE[2]);
  doc.setLineWidth(0.4);
  doc.line(lx, ry - 2, rx, ry - 2);

  // Row 3: Seller Receives
  drawRow(
    "Seller Receives (Net)",
    `INR ${netSellerINR.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    true,
    GREEN
  );

  // Math validation note (small)
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
  doc.text(
    `Gross ${fmtINR(invoice.gross_amount_cents)} − Fee ${fmtINR(invoice.platform_fee_cents)} = Net ${fmtINR(invoice.net_seller_cents)}`,
    lx,
    ry + 2
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 6. PAYMENT REFERENCE (if present)
  // ─────────────────────────────────────────────────────────────────────────
  if (invoice.payment_reference) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
    doc.text(
      `Payment Ref / Transaction ID: ${invoice.payment_reference}`,
      ML,
      summaryY + 6
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. QR CODE — /verify/{invoice_number} — left-aligned below summary area
  // ─────────────────────────────────────────────────────────────────────────
  const qrY = summaryY + sumBoxH + 10;
  const qrSize = 28;

  const qrCodeDataUrl = await QRCode.toDataURL(
    `https://huxzain.shop/verify/${invoice.invoice_number}`,
    { width: 160, margin: 1, color: { dark: "#0B0C10", light: "#F8F8FA" } }
  );

  // QR box background
  doc.setFillColor(GREY_BG[0], GREY_BG[1], GREY_BG[2]);
  roundedRect(doc, ML, qrY - 3, qrSize + 8, qrSize + 14, 3, "F");

  doc.addImage(qrCodeDataUrl, "PNG", ML + 4, qrY, qrSize, qrSize);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
  doc.text("SCAN TO VERIFY", ML + 4, qrY + qrSize + 5, { maxWidth: qrSize });

  // Verification URL text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
  doc.text(
    `huxzain.shop/verify/${invoice.invoice_number}`,
    ML + qrSize + 14,
    qrY + 6,
    { maxWidth: 80 }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.text(
    "Scan the QR code to verify the authenticity of this invoice\non the HUXZAIN platform.",
    ML + qrSize + 14,
    qrY + 13,
    { maxWidth: 80 }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 8. TERMS & CONDITIONS
  // ─────────────────────────────────────────────────────────────────────────
  const termsY = qrY + qrSize + 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
  doc.text("TERMS & CONDITIONS", ML, termsY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
  const termsLines = doc.splitTextToSize(t.terms_text, PW - ML * 2);
  doc.text(termsLines, ML, termsY + 5);

  // ─────────────────────────────────────────────────────────────────────────
  // 9. FOOTER BAND — gold line + footer text
  // ─────────────────────────────────────────────────────────────────────────
  const footerY = PH - 18;

  // Gold line
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(0, footerY - 2, PW, 1, "F");

  // Footer background
  doc.setFillColor(DARK[0], DARK[1], DARK[2]);
  doc.rect(0, footerY - 1, PW, 20, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text(t.footer_text, PW / 2, footerY + 6, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(GREY_TEXT[0], GREY_TEXT[1], GREY_TEXT[2]);
  doc.text(
    `${t.company_address}  |  ${t.support_email}  |  ${t.website_url}`,
    PW / 2,
    footerY + 12,
    { align: "center" }
  );

  // Page number
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}  |  Page 1 of 1`,
    PW / 2,
    footerY + 17,
    { align: "center" }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 10. OUTPUT + UPLOAD ARCHIVAL
  // ─────────────────────────────────────────────────────────────────────────
  const pdfBlob = doc.output("blob");

  if (shouldUpload && !invoice.invoice_pdf_url) {
    try {
      const supabase = getSupabase();
      if (supabase) {
        console.log(
          `[Invoice PDF] Archiving ${invoice.invoice_number}.pdf to storage...`
        );
        const filename = `${invoice.invoice_number}.pdf`;

        const { error: uploadErr } = await supabase.storage
          .from("invoices")
          .upload(filename, pdfBlob, {
            upsert: true,
            contentType: "application/pdf",
          });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("invoices")
            .getPublicUrl(filename);
          const pdfUrl = urlData.publicUrl;

          // SHA-256 integrity hash
          const arrayBuffer = await pdfBlob.arrayBuffer();
          const hashBuffer = await crypto.subtle.digest(
            "SHA-256",
            arrayBuffer
          );
          const hashHex = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          const { error: updateErr } = await supabase
            .from("invoices")
            .update({ invoice_pdf_url: pdfUrl, pdf_hash: hashHex })
            .eq("id", invoice.id);

          if (!updateErr) {
            console.log(
              `[Invoice PDF] Archived: ${invoice.invoice_number} → ${pdfUrl}`
            );
            const userRes = await supabase.auth.getUser();
            await supabase.from("invoice_audit_logs").insert({
              invoice_id: invoice.id,
              action: "pdf_archived",
              actor_id: userRes.data.user?.id || null,
              metadata: { pdf_url: pdfUrl, hash: hashHex },
            });
          } else {
            console.warn(
              "[Invoice PDF] DB update failed:",
              updateErr.message
            );
          }
        } else {
          console.warn(
            "[Invoice PDF] Storage upload failed:",
            uploadErr.message
          );
        }
      }
    } catch (e) {
      console.warn("[Invoice PDF] Archival error:", e);
    }
  }

  return pdfBlob;
}
