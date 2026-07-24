// src/lib/payments/__tests__/verificationQueueService.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVerification, updateVerificationStatus } from "../verificationQueueService";
import { getSupabase } from "../../supabase-client";
import { runOcr } from "../ocrService";
import { calculateFraudScore } from "../fraudScoringService";

// Mock supabase
vi.mock("../../supabase-client", () => ({
  getSupabase: vi.fn(),
}));

// Mock ocrService & fraudScoringService
vi.mock("../ocrService", () => ({
  runOcr: vi.fn(),
}));
vi.mock("../fraudScoringService", () => ({
  calculateFraudScore: vi.fn(),
}));

describe("verificationQueueService", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
      then: vi.fn().mockImplementation((resolve) => resolve({ data: null, error: null })),
    };

    (getSupabase as any).mockReturnValue(mockSupabase);

    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
  });

  describe("createVerification", () => {
    it("should fetch the proof, run OCR, score fraud, and insert records into Supabase", async () => {
      const mockOcrResult = {
        transactionId: "TXN123456",
        amount: 250,
        timestamp: "2026-05-21T10:00:00.000Z",
        confidence: 0.85,
        rawText: "some text",
      };
      (runOcr as any).mockResolvedValue(mockOcrResult);

      const mockFraudResult = {
        score: 15,
        level: "low",
        tags: [],
        confidence: 0.85,
      };
      (calculateFraudScore as any).mockResolvedValue(mockFraudResult);

      const mockVerificationRecord = {
        id: "verification-uuid-123",
        user_id: "user-1",
        order_id: "order-1",
        screenshot_url: "https://example.com/proof.png",
        screenshot_hash: "hash-abc",
        ocr_result: mockOcrResult,
        fraud_score: mockFraudResult,
        status: "pending",
      };

      // Mock database inserts
      mockSupabase.select.mockResolvedValueOnce({ data: [mockVerificationRecord], error: null }); // verification

      const uploadResult = {
        signedUrl: "https://example.com/proof.png",
        hash: "hash-abc",
        duplicate: false,
      };

      const result = await createVerification({
        userId: "user-1",
        orderId: "order-1",
        uploadResult,
      });

      expect(runOcr).toHaveBeenCalledWith(uploadResult.signedUrl);
      expect(calculateFraudScore).toHaveBeenCalledWith({
        userId: "user-1",
        orderId: "order-1",
        transactionId: "TXN123456",
        amount: 250,
        timestamp: "2026-05-21T10:00:00.000Z",
        ocrConfidence: 0.85,
        screenshotHash: "hash-abc",
      });
      expect(result).toEqual(mockVerificationRecord);
    });
  });

  describe("updateVerificationStatus", () => {
    it("should update status and log to history", async () => {
      mockSupabase.update.mockReturnThis();
      mockSupabase.insert.mockResolvedValueOnce({ error: null });

      await updateVerificationStatus({
        verificationId: "verification-uuid-123",
        status: "approved",
        staffUserId: "staff-user-99",
        note: "Looks authentic",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("payment_verifications");
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: "approved",
        staff_user_id: "staff-user-99",
        staff_note: "Looks authentic",
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "verification-uuid-123");
    });
  });
});
