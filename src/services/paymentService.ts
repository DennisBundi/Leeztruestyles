import type { PaymentRequest, PaymentResponse } from '@/types';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;

export class PaymentService {
  /**
   * Initiate M-Pesa STK Push payment via Paystack
   */
  static async initiateMpesaPayment(
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      const response = await fetch('https://api.paystack.co/charge', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: request.email || 'customer@leeztruestyles.com',
          amount: request.amount * 100, // Convert to kobo/cents
          currency: 'KES',
          mobile_money: {
            phone: request.phone,
            provider: 'mpesa',
          },
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
        }),
      });

      const data = await response.json();

      if (data.status) {
        return {
          success: true,
          reference: data.data.reference,
          message: data.message || 'Payment initiated successfully',
        };
      }

      return {
        success: false,
        error: data.message || 'Payment initiation failed',
      };
    } catch (error) {
      console.error('M-Pesa payment error:', error);
      return {
        success: false,
        error: 'Failed to initiate payment',
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
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: request.email!,
          amount: request.amount * 100, // Convert to kobo/cents
          currency: 'KES',
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
        }),
      });

      const data = await response.json();

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
      return {
        success: false,
        error: 'Failed to initialize payment',
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
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      const data = await response.json();

      if (data.status && data.data.status === 'success') {
        return {
          success: true,
          status: 'success',
          data: data.data,
        };
      }

      return {
        success: false,
        status: data.data?.status || 'failed',
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        status: 'failed',
      };
    }
  }
}

