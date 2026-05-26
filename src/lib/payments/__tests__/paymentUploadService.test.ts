// src/lib/payments/__tests__/paymentUploadService.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadPaymentProof } from "../paymentUploadService";
import { getSupabase } from "../../supabase-client";

// Mock getSupabase
vi.mock("../../supabase-client", () => ({
  getSupabase: vi.fn(),
}));

describe("paymentUploadService", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn().mockImplementation(() => mockSupabase.single()),
      upsert: vi.fn().mockResolvedValue({ error: null }),
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
  });

  it("should upload image, generate hash, check duplicates and return signed URL", async () => {
    // Mock duplicate check -> no duplicate
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

    const mockFile = new File(["mock-content"], "receipt.png", { type: "image/png" });

    // Add mock arrayBuffer implementation to File since we run in Node test environment
    mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

    const result = await uploadPaymentProof({
      file: mockFile,
      userId: "user-1",
      orderId: "order-123",
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("screenshot_hashes");
    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        order_id: "order-123",
        hash: "af5570f5a1810b7af78caf4bc70a660f0df51e42baf91d4de5b2328de0e83dfc",
      }),
      { onConflict: "hash" },
    );
    expect(result.duplicate).toBe(false);
    expect(result.hash).toBe("af5570f5a1810b7af78caf4bc70a660f0df51e42baf91d4de5b2328de0e83dfc");
    expect(result.signedUrl).toBe("https://example.com/signed-url");
  });

  it("should flag duplicate if hash exists in db", async () => {
    // Mock duplicate check -> duplicate exists
    mockSupabase.single.mockResolvedValueOnce({ data: { id: "existing-hash-id" }, error: null });

    const mockFile = new File(["mock-content"], "receipt.png", { type: "image/png" });
    mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

    const result = await uploadPaymentProof({
      file: mockFile,
      userId: "user-1",
      orderId: "order-123",
    });

    expect(result.duplicate).toBe(true);
  });
});
