/** @jest-environment node */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const mockAdminClient = {
  from: jest.fn(() => mockAdminClient),
  insert: jest.fn(() => mockAdminClient),
  select: jest.fn(() => mockAdminClient),
  single: jest.fn(),
};

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}));

const validBody = {
  full_name: 'Jane Wanjiku',
  email: 'jane@retailer.co.ke',
  phone: '0712345678',
  business_name: 'Wanjiku Styles',
  goods_category: 'Clothing',
  monthly_order_value: 'KES 50k–100k',
};

describe('POST /api/importation/waitlist', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 201 on valid submission', async () => {
    mockAdminClient.single.mockResolvedValueOnce({
      data: { id: 'abc-123', ...validBody, status: 'pending' },
      error: null,
    });

    const { POST } = await import('@/app/api/importation/waitlist/route');
    const req = new NextRequest('http://localhost/api/importation/waitlist', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.email).toBe('jane@retailer.co.ke');
  });

  it('should return 400 when required fields are missing', async () => {
    const { POST } = await import('@/app/api/importation/waitlist/route');
    const req = new NextRequest('http://localhost/api/importation/waitlist', {
      method: 'POST',
      body: JSON.stringify({ full_name: 'Jane' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid goods_category', async () => {
    const { POST } = await import('@/app/api/importation/waitlist/route');
    const req = new NextRequest('http://localhost/api/importation/waitlist', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, goods_category: 'InvalidCategory' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid monthly_order_value', async () => {
    const { POST } = await import('@/app/api/importation/waitlist/route');
    const req = new NextRequest('http://localhost/api/importation/waitlist', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, monthly_order_value: 'A lot' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 500 when DB insert fails', async () => {
    mockAdminClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error', code: '23505' },
    });

    const { POST } = await import('@/app/api/importation/waitlist/route');
    const req = new NextRequest('http://localhost/api/importation/waitlist', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('should normalize email to lowercase and trimmed', async () => {
    mockAdminClient.single.mockResolvedValueOnce({
      data: { id: 'abc-123', ...validBody, email: 'jane@retailer.co.ke', status: 'pending' },
      error: null,
    });

    const { POST } = await import('@/app/api/importation/waitlist/route');
    const req = new NextRequest('http://localhost/api/importation/waitlist', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, email: '  Jane@Retailer.CO.KE  ' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(req);

    // Verify the insert was called with normalized email
    expect(mockAdminClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@retailer.co.ke' })
    );
  });
});
