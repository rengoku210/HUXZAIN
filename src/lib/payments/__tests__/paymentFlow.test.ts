// src/lib/payments/__tests__/paymentFlow.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadPaymentProof } from "../paymentUploadService";
import { createVerification } from "../verificationQueueService";
import { getSupabase } from "../../supabase-client";

// Mock getSupabase
vi.mock("../../supabase-client", () => ({
  getSupabase: vi.fn(),
}));

// Mock ocrService internal runOcr
vi.mock("../ocrService", () => ({
  runOcr: vi.fn().mockResolvedValue({
    transactionId: "TXN-ABC-123",
    amount: 100,
    timestamp: new Date().toISOString(),
    confidence: 0.9,
    rawText: "Transaction Ref: TXN-ABC-123. Amount ₹100",
  }),
}));

describe("Integration Flow: Upload -> Create Verification", () => {
  let mockSupabase: any;
  let mockHashesQuery: any;
  let mockPaymentsQuery: any;
  let mockOrdersQuery: any;
  let mockHistoryQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockRecord = {
      id: "verification-123",
      user_id: "user-1",
      order_id: "order-1",
      status: "pending",
      screenshot_hash: "af5570f5a1810b7af78caf4bc70a660f0df51e42baf91d4de5b2328de0e83dfc",
    };

    mockHashesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockImplementation(() => mockHashesQuery.single()),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockPaymentsQuery = {
      select: vi.fn((fields) => {
        if (fields === "*") {
          // Return a thenable for the await supabase.insert().select('*')
          return {
            then: (resolve: any) => resolve({ data: [mockRecord], error: null }),
          } as any;
        }
        return mockPaymentsQuery;
      }),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockImplementation(() => mockPaymentsQuery.single()),
      insert: vi.fn().mockReturnThis(),
    };

    mockOrdersQuery = {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({
          data: { amount_total: 100, created_at: new Date().toISOString() },
          error: null,
        }),
      maybeSingle: vi.fn().mockImplementation(() => mockOrdersQuery.single()),
    };

    mockHistoryQuery = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase = {
      from: vi.fn((table) => {
        if (table === "screenshot_hashes") return mockHashesQuery;
        if (table === "payment_verifications") return mockPaymentsQuery;
        if (table === "orders") return mockOrdersQuery;
        if (table === "verification_history") return mockHistoryQuery;
        return mockPaymentsQuery;
      }),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          createSignedUrl: vi
            .fn()
            .mockResolvedValue({
              data: { signedUrl: "https://example.com/signed-url" },
              error: null,
            }),
        })),
      },
    };

    (getSupabase as any).mockReturnValue(mockSupabase);

    // Mock global fetch for verification queue download
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
  });

  it("should run integration upload and verification queue flow", async () => {
    // Perform upload
    const mockFile = new File(["proof"], "payment.png", { type: "image/png" });
    mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

    const uploadResult = await uploadPaymentProof({
      file: mockFile,
      userId: "user-1",
      orderId: "order-1",
    });

    expect(uploadResult.hash).toBe(
      "af5570f5a1810b7af78caf4bc70a660f0df51e42baf91d4de5b2328de0e83dfc",
    );
    expect(uploadResult.duplicate).toBe(false);

    // Perform verification creation
    const verificationRecord = await createVerification({
      userId: "user-1",
      orderId: "order-1",
      uploadResult,
    });

    expect(verificationRecord.id).toBe("verification-123");
    expect(verificationRecord.screenshot_hash).toBe(
      "af5570f5a1810b7af78caf4bc70a660f0df51e42baf91d4de5b2328de0e83dfc",
    );
  });
});
