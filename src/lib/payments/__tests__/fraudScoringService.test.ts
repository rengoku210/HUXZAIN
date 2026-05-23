// src/lib/payments/__tests__/fraudScoringService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateFraudScore } from '../fraudScoringService';
import { getSupabase } from '../../supabase-client';

vi.mock('../../supabase-client', () => ({
  getSupabase: vi.fn(),
}));

describe('fraudScoringService', () => {
  let mockSupabase: any;
  let mockPaymentsQuery: any;
  let mockHashesQuery: any;
  let mockOrdersQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPaymentsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockHashesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockOrdersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockSupabase = {
      from: vi.fn((table) => {
        if (table === 'payment_verifications') return mockPaymentsQuery;
        if (table === 'screenshot_hashes') return mockHashesQuery;
        if (table === 'orders') return mockOrdersQuery;
        return mockPaymentsQuery;
      }),
    };

    (getSupabase as any).mockReturnValue(mockSupabase);
  });

  it('should return low score if no anomalies are found', async () => {
    // Mock orders query to return correct order amount and date matching inputs
    const nowStr = new Date().toISOString();
    mockOrdersQuery.single.mockResolvedValue({ data: { amount_total: 100, created_at: nowStr }, error: null });

    const result = await calculateFraudScore({
      userId: 'user-1',
      orderId: 'order-1',
      transactionId: 'TXN123',
      amount: 100,
      timestamp: nowStr,
      ocrConfidence: 0.9,
      screenshotHash: 'hash-1',
    });

    expect(result.score).toBeLessThanOrEqual(10);
    expect(result.level).toBe('low');
    expect(result.tags).toHaveLength(0);
  });

  it('should detect duplicate transaction ID', async () => {
    // Mock duplicate txn query to return a record
    mockPaymentsQuery.single.mockResolvedValue({ data: { id: 'other-ver-id' }, error: null });

    const result = await calculateFraudScore({
      userId: 'user-1',
      orderId: 'order-1',
      transactionId: 'TXN123_DUP',
    });

    expect(result.tags).toContain('duplicate-transaction');
    expect(result.score).toBeGreaterThanOrEqual(30);
  });

  it('should detect duplicate screenshot hash', async () => {
    // Mock duplicate screenshot hash query to return a record
    mockHashesQuery.single.mockResolvedValue({ data: { id: 'dup-id' }, error: null });

    const result = await calculateFraudScore({
      userId: 'user-1',
      orderId: 'order-1',
      screenshotHash: 'hash-duplicate',
    });

    expect(result.tags).toContain('duplicate-screenshot');
    expect(result.score).toBeGreaterThanOrEqual(30);
  });

  it('should detect amount mismatch', async () => {
    // Mock order amount to return 100
    mockOrdersQuery.single.mockResolvedValue({ data: { amount_total: 100 }, error: null });

    const result = await calculateFraudScore({
      userId: 'user-1',
      orderId: 'order-1',
      amount: 150, // different amount
    });

    expect(result.tags).toContain('amount-mismatch');
    expect(result.score).toBeGreaterThanOrEqual(20);
  });

  it('should detect timestamp drift', async () => {
    // Mock order created_at to return 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    mockOrdersQuery.single.mockResolvedValue({ data: { created_at: oneHourAgo, amount_total: 100 }, error: null });

    const result = await calculateFraudScore({
      userId: 'user-1',
      orderId: 'order-1',
      timestamp: new Date().toISOString(), // current time
      amount: 100,
    });

    expect(result.tags).toContain('timestamp-drift');
  });

  it('should detect low ocr confidence', async () => {
    const result = await calculateFraudScore({
      userId: 'user-1',
      orderId: 'order-1',
      ocrConfidence: 0.4, // < 0.6
    });

    expect(result.tags).toContain('low-ocr-confidence');
    expect(result.score).toBeGreaterThanOrEqual(15);
  });
});
