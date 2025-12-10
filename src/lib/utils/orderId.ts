/**
 * Generates a short, readable order number from a UUID
 * Format: LEEZT + last 6 characters of UUID (uppercase)
 * Example: LEEZT-A3B2C1
 */
export function formatOrderId(orderId: string): string {
  if (!orderId) return 'N/A';
  
  // Extract last 6 characters of UUID (after removing dashes)
  const cleanId = orderId.replace(/-/g, '').toUpperCase();
  const shortId = cleanId.slice(-6);
  
  return `LEEZT-${shortId}`;
}

/**
 * Generates a short order number with sequential format
 * Format: LEEZT + padded number
 * Example: LEEZT-0001, LEEZT-0002
 * 
 * Note: This requires storing order_number in database for sequential numbering
 * For now, we'll use the UUID-based format above
 */
export function formatOrderIdSequential(orderNumber: number): string {
  if (!orderNumber) return 'N/A';
  return `LEEZT-${String(orderNumber).padStart(4, '0')}`;
}

