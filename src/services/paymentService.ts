import https from 'https';
import type { PaymentRequest, PaymentResponse } from '@/types';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * Make HTTPS request using Node.js built-in module.
 * Bypasses Next.js fetch patching which causes timeouts on Windows.
 */
function paystackRequest(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>
): Promise<{ status: boolean; message: string; data: Record<string, unknown> }> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return Promise.reject(new Error('PAYSTACK_SECRET_KEY is not configured'));

  const postData = body ? JSON.stringify(body) : undefined;

  return new Promise((resolve, reject) => {
    const url = new URL(path, PAYSTACK_BASE_URL);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method,
        family: 4, // Force IPv4 — NAT64 IPv6 (64:ff9b::) is unreliable on Windows
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
        timeout: 30000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid JSON response: ${data.substring(0, 200)}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (postData) req.write(postData);
    req.end();
  });
}

export class PaymentService {
  /**
   * Format phone number to 2547XXXXXXXX format (12 digits starting with 2547)
   */
  private static formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/\D/g, '');

    if (formatted.startsWith('254')) {
      // already correct prefix
    } else if (formatted.startsWith('0')) {
      formatted = `254${formatted.substring(1)}`;
    } else if (formatted.startsWith('7') || formatted.startsWith('1')) {
      formatted = `254${formatted}`;
    }

    // Accept any 12-digit Kenyan number: 2547xx (Safaricom/Airtel), 25411x (Safaricom), 25410x (Airtel)
    if (!/^254\d{9}$/.test(formatted)) {
      throw new Error(`Invalid phone number format. Expected a 12-digit Kenyan number starting with 254, got: ${formatted}`);
    }

    return formatted;
  }

  /**
   * Initiate M-Pesa payment via Paystack (mobile_money channel)
   */
  static async initiateMpesaPayment(
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    if (!request.phone) {
      return { success: false, error: 'Phone number is required for M-Pesa payment' };
    }

    let formattedPhone: string;
    try {
      formattedPhone = this.formatPhoneNumber(request.phone);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid phone number format',
      };
    }

    try {
      const email = request.email || `${formattedPhone}@customer.leeztruestyles.com`;

      const data = await paystackRequest('POST', '/transaction/initialize', {
        email,
        amount: request.amount * 100,
        currency: 'KES',
        channels: ['mobile_money'],
        callback_url: request.callback_url,
        reference: `order_${request.order_id}_${Date.now()}`,
        metadata: {
          order_id: request.order_id,
          phone: `+${formattedPhone}`,
          custom_fields: [
            {
              display_name: 'Order ID',
              variable_name: 'order_id',
              value: request.order_id,
            },
          ],
        },
      });

      console.log('Paystack M-Pesa response:', JSON.stringify(data));

      if (data.status) {
        return {
          success: true,
          reference: data.data.reference,
          authorization_url: data.data.authorization_url,
          message: data.message || 'Redirecting to M-Pesa payment...',
        };
      }

      return {
        success: false,
        error: data.message || 'M-Pesa payment initialization failed',
      };
    } catch (error) {
      console.error('M-Pesa payment error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to initiate M-Pesa payment: ${errorMessage}`,
      };
    }
  }

  /**
   * Initiate card payment via Paystack
   */
  static async initiateCardPayment(
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      const data = await paystackRequest('POST', '/transaction/initialize', {
        email: request.email!,
        amount: request.amount * 100,
        currency: 'KES',
        callback_url: request.callback_url,
        reference: `order_${request.order_id}_${Date.now()}`,
        metadata: {
          order_id: request.order_id,
          custom_fields: [
            {
              display_name: 'Order ID',
              variable_name: 'order_id',
              value: request.order_id,
            },
          ],
        },
      });

      if (data.status) {
        return {
          success: true,
          reference: data.data.reference,
          authorization_url: data.data.authorization_url,
          message: data.message || 'Payment initialized successfully',
        };
      }

      return {
        success: false,
        error: data.message || 'Payment initialization failed',
      };
    } catch (error) {
      console.error('Card payment error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to initialize payment: ${errorMessage}`,
      };
    }
  }

  /**
   * Verify payment status
   */
  static async verifyPayment(reference: string): Promise<{
    success: boolean;
    status: 'success' | 'failed' | 'pending';
    data?: any;
  }> {
    try {
      const data = await paystackRequest('GET', `/transaction/verify/${reference}`);

      if (data.status && data.data.status === 'success') {
        return { success: true, status: 'success', data: data.data };
      }

      return { success: false, status: data.data?.status ?? 'failed' };
    } catch (error) {
      console.error('Payment verification error:', error);
      return { success: false, status: 'failed' };
    }
  }
}
