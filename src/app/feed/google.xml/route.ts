// src/app/feed/google.xml/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 3600;

const SITE_URL = 'https://leeztruestyles.com';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const admin = createAdminClient();

  const { data: products, error } = await admin
    .from('products')
    .select('id, name, description, price, sale_price, images, is_flash_sale, flash_sale_end, status')
    .eq('status', 'active');

  if (error || !products) {
    return new NextResponse('Failed to fetch products', { status: 500 });
  }

  const { data: inventory } = await admin
    .from('inventory')
    .select('product_id, stock_quantity');

  const stockMap = new Map<string, number>();
  for (const row of inventory ?? []) {
    stockMap.set(row.product_id, row.stock_quantity);
  }

  const now = new Date();

  const items = products
    .filter((p) => Array.isArray(p.images) && p.images[0])
    .map((p) => {
      const stockQty = stockMap.get(p.id) ?? 0;
      const availability = stockQty > 0 ? 'in stock' : 'out of stock';

      const isActiveSale =
        p.is_flash_sale &&
        p.sale_price != null &&
        p.flash_sale_end != null &&
        new Date(p.flash_sale_end) > now;

      const additionalImages = (p.images as string[])
        .slice(1, 10)
        .map((img) => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`)
        .join('\n');

      return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(p.description || p.name)}</g:description>
      <g:link>${SITE_URL}/products/${escapeXml(p.id)}</g:link>
      <g:image_link>${escapeXml((p.images as string[])[0])}</g:image_link>
${additionalImages ? additionalImages + '\n' : ''}      <g:availability>${availability}</g:availability>
      <g:price>${p.price} KES</g:price>
${isActiveSale ? `      <g:sale_price>${p.sale_price} KES</g:sale_price>\n` : ''}      <g:brand>Leez True Styles</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Leez True Styles</title>
    <link>${SITE_URL}</link>
    <description>Fashion clothing store in Kenya</description>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
