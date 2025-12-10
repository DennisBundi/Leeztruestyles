const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;

export class WhatsAppService {
  /**
   * Format phone number for WhatsApp URL (removes all non-digit characters)
   * WhatsApp requires: country code + phone number (digits only, no +, spaces, or special chars)
   * Format: 254XXXXXXXXX (11-12 digits total for Kenya)
   */
  private static formatPhoneForWhatsApp(phone: string): string {
    // Remove all non-digit characters (including +, spaces, dashes, etc.)
    let cleaned = phone.replace(/\D/g, '');
    
    // If the number starts with 0, remove it (Kenyan numbers sometimes have leading 0)
    // Example: 097877254 -> 97877254
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Ensure we have a valid format: should start with country code (254 for Kenya)
    // If it doesn't start with 254, and it's 9 digits, add 254
    if (!cleaned.startsWith('254') && cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }
    
    // Validate: WhatsApp numbers should be 10-15 digits total
    // Kenyan numbers: 254 (3) + 9 digits = 12 digits OR 254 (3) + 8 digits = 11 digits
    if (cleaned.length < 10 || cleaned.length > 15) {
      console.warn('WhatsApp phone number may be invalid. Length:', cleaned.length, 'Number:', cleaned);
    }
    
    return cleaned;
  }

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
    // Use the business phone number from env or default to 254797877254 (without +)
    const businessPhone = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE || '254797877254';
    // Format phone number for WhatsApp URL (digits only)
    const phoneNumber = this.formatPhoneForWhatsApp(businessPhone);
    return `https://wa.me/${phoneNumber}?text=${message}`;
  }

  /**
   * Generate WhatsApp link for general inquiry (opens with pre-filled message)
   */
  static generateGeneralInquiryLink(): string {
    const message = encodeURIComponent(
      `Hello! I'm interested in your products. Could you please help me?`
    );
    // Use the business phone number from env or default to 25497877254
    // Note: WhatsApp requires the number without + sign, just digits
    const businessPhone = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE || '25497877254';
    // Format phone number for WhatsApp URL (digits only)
    const phoneNumber = this.formatPhoneForWhatsApp(businessPhone);
    
    // Validate: WhatsApp numbers should be 10-15 digits total
    if (phoneNumber.length < 10 || phoneNumber.length > 15) {
      console.error('Invalid WhatsApp phone number length:', phoneNumber);
    }
    
    return `https://wa.me/${phoneNumber}?text=${message}`;
  }
}

