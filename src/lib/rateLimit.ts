// Simple in-memory rate limiter
// For production, use Redis or a dedicated rate limiting service

interface RateLimitStore {
  [key: string]: number[];
}

const store: RateLimitStore = {};

export function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = identifier;

  if (!store[key]) {
    store[key] = [];
  }

  // Remove old entries outside the window
  store[key] = store[key].filter((timestamp) => now - timestamp < windowMs);

  // Check if limit exceeded
  if (store[key].length >= maxRequests) {
    return false;
  }

  // Add current request
  store[key].push(now);
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 60000; // 1 minute

  Object.keys(store).forEach((key) => {
    store[key] = store[key].filter((timestamp) => now - timestamp < windowMs);
    if (store[key].length === 0) {
      delete store[key];
    }
  });
}, 60000); // Clean up every minute

