import axios from 'axios';

const DARAJA_CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY!;
const DARAJA_CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET!;
const DARAJA_PASSKEY = process.env.DARAJA_PASSKEY!;
const DARAJA_BUSINESS_SHORTCODE = process.env.DARAJA_BUSINESS_SHORTCODE!;
// Default callback URL if not provided (should be ngrok for local dev)
const DARAJA_CALLBACK_URL = process.env.DARAJA_CALLBACK_URL || 'https://leeztruestyles.com/api/payments/callback/mpesa';

// Daraja API URLs
const DARAJA_AUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const DARAJA_STK_PUSH_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

// Switch to production URLs based on env
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const AUTH_URL = IS_PRODUCTION
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : DARAJA_AUTH_URL;
const STK_URL = IS_PRODUCTION
    ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    : DARAJA_STK_PUSH_URL;

export class DarajaService {

    private static async getAccessToken(): Promise<string> {
        const credentials = Buffer.from(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`).toString('base64');

        try {
            const response = await axios.get(AUTH_URL, {
                headers: {
                    'Authorization': `Basic ${credentials}`
                }
            });
            return response.data.access_token;
        } catch (error) {
            console.error('Daraja Auth Error:', error);
            throw new Error('Failed to get Daraja access token');
        }
    }

    static async initiateSTKPush(
        phone: string,
        amount: number,
        orderId: string
    ): Promise<{ success: boolean; reference?: string; message?: string; error?: string }> {
        try {
            if (!DARAJA_CONSUMER_KEY || !DARAJA_CONSUMER_SECRET || !DARAJA_PASSKEY || !DARAJA_BUSINESS_SHORTCODE) {
                console.error('Missing Daraja Environment Variables');
                return { success: false, error: 'Payment configuration missing (Daraja)' };
            }

            // Validate BusinessShortCode is numeric
            if (!/^\d+$/.test(DARAJA_BUSINESS_SHORTCODE)) {
                console.error('Invalid BusinessShortCode: must be numeric');
                return { success: false, error: 'Invalid BusinessShortCode configuration' };
            }

            // Validate phone number format (2547XXXXXXXX - 12 digits starting with 2547)
            if (!/^2547\d{9}$/.test(phone)) {
                console.error('Invalid phone number format:', phone);
                return { 
                    success: false, 
                    error: 'Invalid phone number format. Must be 2547XXXXXXXX (12 digits starting with 2547)' 
                };
            }

            const token = await this.getAccessToken();

            const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
            const password = Buffer.from(
                `${DARAJA_BUSINESS_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`
            ).toString('base64');

            // AccountReference: max 12 characters (alphanumeric)
            const accountReference = orderId.slice(0, 12);
            
            // TransactionDesc: max 13 characters
            const transactionDesc = `Order${orderId.slice(0, 7)}`; // "Order" (5) + 7 chars = 12 chars (safe)

            const payload = {
                BusinessShortCode: DARAJA_BUSINESS_SHORTCODE,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: Math.round(amount), // Ensure integer
                PartyA: phone, // Phone sending money
                PartyB: DARAJA_BUSINESS_SHORTCODE, // Shortcode receiving money
                PhoneNumber: phone,
                CallBackURL: DARAJA_CALLBACK_URL,
                AccountReference: accountReference, // Max 12 chars
                TransactionDesc: transactionDesc // Max 13 chars
            };

            console.log('Sending Daraja STK Push:', { ...payload, Password: 'REDACTED' });

            const response = await axios.post(STK_URL, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Handle response codes
            const responseCode = response.data.ResponseCode;
            const responseDescription = response.data.ResponseDescription || response.data.CustomerMessage || '';

            if (responseCode === '0') {
                return {
                    success: true,
                    reference: response.data.CheckoutRequestID,
                    message: response.data.CustomerMessage || responseDescription
                };
            } else {
                // Parse Daraja-specific error codes
                let errorMessage = 'STK Push failed';
                
                if (response.data.errorCode) {
                    // Handle specific Daraja error codes
                    const errorCode = response.data.errorCode;
                    switch (errorCode) {
                        case '400.002.02':
                            errorMessage = 'Invalid Business ShortCode';
                            break;
                        case '404.001.03':
                            errorMessage = 'Invalid Access Token. Please try again.';
                            break;
                        case '404.001.01':
                            errorMessage = 'Resource not found. Invalid API endpoint.';
                            break;
                        case '500.001.001':
                            errorMessage = response.data.errorMessage || 'Merchant does not exist or wrong credentials';
                            break;
                        default:
                            errorMessage = response.data.errorMessage || responseDescription || `Error: ${errorCode}`;
                    }
                } else if (responseDescription) {
                    errorMessage = responseDescription;
                } else if (response.data.errorMessage) {
                    errorMessage = response.data.errorMessage;
                }

                console.error('Daraja STK Push failed:', {
                    ResponseCode: responseCode,
                    ResponseDescription: responseDescription,
                    ErrorCode: response.data.errorCode,
                    ErrorMessage: response.data.errorMessage,
                });

                return {
                    success: false,
                    error: errorMessage
                };
            }

        } catch (error: any) {
            console.error('Daraja STK Error:', error.response?.data || error.message);
            
            // Parse error response if available
            let errorMessage = 'Failed to initiate M-Pesa payment';
            
            if (error.response?.data) {
                const errorData = error.response.data;
                
                if (errorData.errorCode) {
                    // Handle specific Daraja error codes
                    switch (errorData.errorCode) {
                        case '400.002.02':
                            errorMessage = 'Invalid Business ShortCode';
                            break;
                        case '404.001.03':
                            errorMessage = 'Invalid Access Token. Please try again.';
                            break;
                        case '404.001.01':
                            errorMessage = 'Resource not found. Invalid API endpoint.';
                            break;
                        default:
                            errorMessage = errorData.errorMessage || errorData.errorMessage || `Error: ${errorData.errorCode}`;
                    }
                } else if (errorData.errorMessage) {
                    errorMessage = errorData.errorMessage;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }
}
