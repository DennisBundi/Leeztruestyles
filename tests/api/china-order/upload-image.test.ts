/**
 * @jest-environment node
 */
import { POST } from '@/app/api/china-order/upload-image/route'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server')

const mockUpload = jest.fn()
const mockGetPublicUrl = jest.fn()
const mockStorageFrom = jest.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }))
const mockSupabase = { storage: { from: mockStorageFrom } }

function makeRequest(file?: File): NextRequest {
  const formData = new FormData()
  if (file) formData.append('file', file)
  return { formData: async () => formData } as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  mockUpload.mockResolvedValue({ error: null })
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/img.jpg' } })
})

describe('POST /api/china-order/upload-image', () => {
  it('returns 400 when no file is provided', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('No file provided')
  })

  it('returns 400 for unsupported file type', async () => {
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid file type')
  })

  it('returns 400 when file exceeds 5MB', async () => {
    const file = new File([new Uint8Array(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('File too large')
  })

  it('returns 500 when Supabase upload fails', async () => {
    mockUpload.mockResolvedValue({ error: new Error('bucket not found') })
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Upload failed')
  })

  it('returns 200 with public URL on success', async () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('https://example.com/img.jpg')
    expect(mockStorageFrom).toHaveBeenCalledWith('china-order-images')
  })
})
