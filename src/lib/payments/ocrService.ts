// src/lib/payments/ocrService.ts
import { createWorker, Worker } from "tesseract.js";

export interface OcrResult {
  transactionId?: string;
  amount?: number;
  timestamp?: string; // ISO string
  paymentApp?: string;
  receiverInfo?: string;
  confidence?: number; // 0-1
  rawText: string;
}

let worker: Worker | null = null;

async function getWorker(): Promise<Worker> {
  if (!worker) {
    worker = await createWorker({
      logger: (m) => console.debug(m),
    });
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
  }
  return worker;
}

/**
 * Run OCR on an image buffer using Tesseract.js.
 * Returns raw text and parsed fields.
 */
export async function runOcr(buffer: Buffer): Promise<OcrResult> {
  const w = await getWorker();
  const { data } = await w.recognize(buffer);
  const raw = data.text;
  const confidence = data.confidence ? data.confidence / 100 : undefined;
  const parsed = parseOcrText(raw);
  return {
    ...parsed,
    confidence,
    rawText: raw,
  };
}

/**
 * Simple regex‑based extractor for the most common fields.
 * Adjust patterns as needed for different payment app screenshots.
 */
export function parseOcrText(text: string): Partial<OcrResult> {
  const result: Partial<OcrResult> = {};
  // Transaction/UTR ID – look for alphanumeric strings of length 8‑20, allowing optional ID/Ref suffixes
  const txnMatch = text.match(
    /(?:UTR|Transaction(?:\s+ID)?|Ref(?:erence)?(?:\s+(?:No|Num|Number))?)\s*[:#]?\s*([A-Z0-9]{8,20})/i,
  );
  if (txnMatch) result.transactionId = txnMatch[1];

  // Amount – capture numbers with optional commas and decimal
  const amountMatch = text.match(/(?:Amount|₹|Rs\.?|\$)\s*[:]?\s*([\d,]+\.?\d{0,2})/i);
  if (amountMatch) {
    const num = amountMatch[1].replace(/,/g, "");
    result.amount = parseFloat(num);
  }

  // Date / timestamp – common date formats
  const dateMatch = text.match(
    /(?:Date|Time)\s*[:]?\s*([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{2,4})(?:\s+([0-9]{1,2}:[0-9]{2}(?:\s?[AP]M)?))?/i,
  );
  if (dateMatch) {
    const datePart = dateMatch[1];
    const timePart = dateMatch[2] ?? "00:00";
    const iso = new Date(`${datePart} ${timePart}`).toISOString();
    result.timestamp = iso;
  }

  // Payment app name – look for known apps
  const appMatch = text.match(/(Paytm|Google Pay|PhonePe|BHIM|UPI|Razorpay|Bank)/i);
  if (appMatch) result.paymentApp = appMatch[1].trim();

  // Receiver info – capture line after "To" or "Recipient"
  const recvMatch = text.match(/(?:To|Recipient)\s*[:#]?\s*([A-Za-z0-9 ,.-]{5,})/i);
  if (recvMatch) {
    let name = recvMatch[1].trim();
    // Strip trailing verbs commonly found in transaction sentences
    name = name.replace(/\s+(?:successfully|completed|transferred|sent|paid|of)\b.*/i, "");
    result.receiverInfo = name;
  }

  return result;
}
