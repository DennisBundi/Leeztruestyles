import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';
import ReviewSummary from '@/components/reviews/ReviewSummary';
import ReviewList from '@/components/reviews/ReviewList';
import ReviewForm from '@/components/reviews/ReviewForm';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://leeztruestyles.com';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('name, description, price, sale_price, images')
    .eq('id', params.id)
    .single();

  if (!product) {
    return { title: 'Product Not Found - Leeztruestyles' };
  }

  const price = product.sale_price || product.price;
  const imageUrl = Array.isArray(product.images) && product.images[0]
    ? product.images[0]
    : undefined;

  return {
    title: `${product.name} - Leeztruestyles`,
    description: product.description
      ? product.description.slice(0, 160)
      : `Shop ${product.name} at Leeztruestyles. KSh ${price}. Fast delivery across Kenya.`,
    openGraph: {
      title: `${product.name} - Leeztruestyles`,
      description: product.description
        ? product.description.slice(0, 160)
        : `Shop ${product.name} at Leeztruestyles.`,
      type: 'website',
      ...(imageUrl && { images: [{ url: imageUrl }] }),
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  // Parallel fetch: product, inventory, colors, sizes, reviews
  const [productResult, inventoryResult, colorsResult, sizesResult, reviewsResult] = await Promise.all([
    supabase.from('products').select('*').eq('id', params.id).single(),
    supabase.from('inventory').select('stock_quantity, reserved_quantity').eq('product_id', params.id).single(),
    supabase.from('product_colors').select('color').eq('product_id', params.id),
    supabase.from('product_sizes').select('size, stock_quantity, reserved_quantity').eq('product_id', params.id).order('size', { ascending: true }),
    supabase.from('reviews').select('rating').eq('product_id', params.id),
  ]);

  const product = productResult.data;
  if (productResult.error || !product) {
    notFound();
  }

  const inventory = inventoryResult.data;
  const productColors = colorsResult.data;
  const productSizes = sizesResult.data;
  const reviews = reviewsResult.data ?? [];
  const reviewCount = reviews.length;
  const ratingValue = reviewCount > 0
    ? reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviewCount
    : 0;

  // Fetch category (depends on product data)
  let categoryName = 'Uncategorized';
  if (product.category_id) {
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', product.category_id)
      .single();
    if (category) {
      categoryName = category.name;
    }
  }

  const availableStock = inventory
    ? Math.max(0, (inventory.stock_quantity || 0) - (inventory.reserved_quantity || 0))
    : undefined;

  const sizes = productSizes ? productSizes.map((ps: any) => ({
    size: ps.size,
    available: Math.max(0, (ps.stock_quantity || 0) - (ps.reserved_quantity || 0)),
  })) : [];

  const colors = productColors ? productColors.map((pc: any) => pc.color) : [];

  const productData = {
    ...product,
    available_stock: availableStock,
    categories: { name: categoryName },
    colors: colors,
    sizes: sizes,
  };

  // JSON-LD structured data for product
  const imageUrl = Array.isArray(product.images) && product.images[0]
    ? product.images[0]
    : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || '',
    sku: params.id,
    ...(imageUrl && { image: imageUrl }),
    offers: {
      '@type': 'Offer',
      price: product.sale_price || product.price,
      priceCurrency: 'KES',
      availability: availableStock === undefined || availableStock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${baseUrl}/products/${params.id}`,
    },
    brand: {
      '@type': 'Brand',
      name: 'Leez True Styles',
    },
    ...(reviewCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: ratingValue.toFixed(1),
        reviewCount: String(reviewCount),
      },
    }),
  };

  return (
    <>
      {/* Safe: JSON.stringify escapes all HTML/script content in the structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductDetailClient product={productData} />
      {/* Reviews Section */}
      <section className="container mx-auto px-4 py-12 border-t border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Customer Reviews</h2>
        <ReviewSummary productId={params.id} />
        <div className="mt-8">
          <ReviewForm productId={params.id} />
        </div>
        <div className="mt-8">
          <ReviewList productId={params.id} />
        </div>
      </section>
    </>
  );
}
