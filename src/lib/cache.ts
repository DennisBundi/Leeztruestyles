// Cache utilities for Next.js

export const revalidate = {
  // Product data - revalidate every 60 seconds
  products: 60,
  // Category data - revalidate every 5 minutes
  categories: 300,
  // Inventory - revalidate every 30 seconds (more frequent for stock)
  inventory: 30,
  // Orders - revalidate every 10 seconds
  orders: 10,
};

export function getCacheHeaders(seconds: number) {
  return {
    'Cache-Control': `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}`,
  };
}

