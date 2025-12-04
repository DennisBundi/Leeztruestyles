import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  // Fetch product from Supabase
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  if (productError || !product) {
    notFound();
  }

  // Fetch inventory with error handling
  const { data: inventory, error: inventoryError } = await supabase
    .from('inventory')
    .select('stock_quantity, reserved_quantity')
    .eq('product_id', params.id)
    .single();

  if (inventoryError && inventoryError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is okay if inventory doesn't exist yet
    console.error('Error fetching inventory:', inventoryError);
  }

  // Fetch category
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

  // Calculate available stock - use undefined if inventory doesn't exist
  const availableStock = inventory
    ? Math.max(0, (inventory.stock_quantity || 0) - (inventory.reserved_quantity || 0))
    : undefined;

  // Prepare product data for client component
  const productData = {
    ...product,
    available_stock: availableStock,
    categories: { name: categoryName },
    // Note: variants and sizes are not in Supabase schema yet
    // These can be added later if needed
    variants: undefined,
    sizes: undefined,
  };

  return <ProductDetailClient product={productData} />;
}
