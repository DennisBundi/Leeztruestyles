const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;

export class WhatsAppService {
  /**
   * Send WhatsApp message via Business API
   */
  static async sendMessage(
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Format phone number (remove + and ensure proper format)
      const formattedPhone = phoneNumber.replace(/^\+/, '').replace(/\s/g, '');

      const response = await fetch(
        `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: {
              body: message,
            },
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        return {
          success: false,
          error: data.error.message || 'Failed to send message',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('WhatsApp message error:', error);
      return {
        success: false,
        error: 'Failed to send WhatsApp message',
      };
    }
  }

  /**
   * Send product inquiry message
   */
  static async sendProductInquiry(
    phoneNumber: string,
    productName: string,
    productUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    const message = `Hello! I'm interested in: ${productName}\n\nView product: ${productUrl}\n\nCould you please provide more information about this item?`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Generate WhatsApp link for product inquiry
   */
  static generateProductInquiryLink(
    productName: string,
    productUrl: string
  ): string {
    const message = encodeURIComponent(
      `Hello! I'm interested in: ${productName}\n\nView product: ${productUrl}\n\nCould you please provide more information about this item?`
    );
    const businessPhone = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE || '';
    return `https://wa.me/${businessPhone}?text=${message}`;
  }
}

