import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  const supabase = await createClient()
  const path = `orders/${Date.now()}-${Math.random().toString(36).slice(2)}/${file.name}`
  const buffer = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('china-order-images')
    .upload(path, buffer, { contentType: file.type })

  if (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data } = supabase.storage.from('china-order-images').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
