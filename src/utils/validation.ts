import { z } from 'zod';

// Sanitize string input
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Validate email
export const emailSchema = z.string().email().max(255);

// Validate phone number (Kenyan format)
export const phoneSchema = z.string().regex(/^(\+254|0)[17]\d{8}$/);

// Validate price
export const priceSchema = z.number().positive().max(10000000);

// Validate quantity
export const quantitySchema = z.number().int().positive().max(1000);

// Sanitize and validate product name
export function validateProductName(name: string): string {
  const sanitized = sanitizeString(name);
  if (sanitized.length < 1 || sanitized.length > 255) {
    throw new Error('Product name must be between 1 and 255 characters');
  }
  return sanitized;
}

