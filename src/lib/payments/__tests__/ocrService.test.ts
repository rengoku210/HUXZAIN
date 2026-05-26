// src/lib/payments/__tests__/ocrService.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { runOcr, parseOcrText } from "../ocrService";
import { createWorker } from "tesseract.js";

vi.mock("tesseract.js", () => {
  const mockWorker = {
    loadLanguage: vi.fn(),
    initialize: vi.fn(),
    recognize: vi.fn().mockResolvedValue({
      data: {
        text: "UTR: UTR123456789\nAmount: ₹1,500.00\nDate: 2026-05-21 14:30\nGoogle Pay\nTo: HUXZAIN STORE",
        confidence: 95,
      },
    }),
  };
  return {
    createWorker: vi.fn().mockResolvedValue(mockWorker),
  };
});

describe("ocrService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseOcrText", () => {
    it("should parse UTR / Transaction ID correctly", () => {
      const text = "Transaction ID: TXN9876543210";
      const parsed = parseOcrText(text);
      expect(parsed.transactionId).toBe("TXN9876543210");
    });

    it("should parse amount correctly with different symbols", () => {
      const text1 = "Amount: ₹2,500.50";
      const text2 = "Rs. 450";
      const text3 = "Paid $120.00 to merchant";

      expect(parseOcrText(text1).amount).toBe(2500.5);
      expect(parseOcrText(text2).amount).toBe(450);
      expect(parseOcrText(text3).amount).toBe(120);
    });

    it("should parse date and timestamp into ISO format", () => {
      const text = "Date: 05/21/2026 Time: 14:30";
      const parsed = parseOcrText(text);
      expect(parsed.timestamp).toBeDefined();
      expect(new Date(parsed.timestamp!).getFullYear()).toBe(2026);
    });

    it("should identify known payment apps", () => {
      const text = "Payment done via PhonePe: successfully transferred";
      const parsed = parseOcrText(text);
      expect(parsed.paymentApp).toBe("PhonePe");
    });

    it("should extract receiver information", () => {
      const text = "Transfer to John Doe Store successfully completed";
      const parsed = parseOcrText(text);
      expect(parsed.receiverInfo).toBe("John Doe Store");
    });
  });

  describe("runOcr", () => {
    it("should run OCR and return full OcrResult", async () => {
      const buffer = Buffer.from("mock-image-data");
      const result = await runOcr(buffer);

      expect(createWorker).toHaveBeenCalled();
      expect(result.confidence).toBe(0.95);
      expect(result.transactionId).toBe("UTR123456789");
      expect(result.amount).toBe(1500);
      expect(result.paymentApp).toBe("Google Pay");
      expect(result.receiverInfo).toBe("HUXZAIN STORE");
    });
  });
});
