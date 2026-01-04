import axios from "axios";

const DARAJA_CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY!;
const DARAJA_CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET!;
const DARAJA_PASSKEY = process.env.DARAJA_PASSKEY!;
const DARAJA_BUSINESS_SHORTCODE = process.env.DARAJA_BUSINESS_SHORTCODE!;
// Default callback URL if not provided (should be ngrok for local dev)
const DARAJA_CALLBACK_URL =
  process.env.DARAJA_CALLBACK_URL ||
  "https://leeztruestyles.com/api/payments/callback/mpesa";

// Daraja API URLs
const DARAJA_AUTH_URL =
  "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const DARAJA_STK_PUSH_URL =
  "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
const DARAJA_STK_QUERY_URL =
  "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query";

// Switch to production URLs based on env
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const AUTH_URL = IS_PRODUCTION
  ? "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
  : DARAJA_AUTH_URL;
const STK_URL = IS_PRODUCTION
  ? "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
  : DARAJA_STK_PUSH_URL;
const STK_QUERY_URL = IS_PRODUCTION
  ? "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query"
  : DARAJA_STK_QUERY_URL;

export class DarajaService {
  private static async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(
      `${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`
    ).toString("base64");

    try {
      const response = await axios.get(AUTH_URL, {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });
      return response.data.access_token;
    } catch (error) {
      console.error("Daraja Auth Error:", error);
      throw new Error("Failed to get Daraja access token");
    }
  }

  static async initiateSTKPush(
    phone: string,
    amount: number,
    orderId: string
  ): Promise<{
    success: boolean;
    reference?: string;
    message?: string;
    error?: string;
  }> {
    try {
      if (
        !DARAJA_CONSUMER_KEY ||
        !DARAJA_CONSUMER_SECRET ||
        !DARAJA_PASSKEY ||
        !DARAJA_BUSINESS_SHORTCODE
      ) {
        console.error("Missing Daraja Environment Variables");
        return {
          success: false,
          error: "Payment configuration missing (Daraja)",
        };
      }

      const token = await this.getAccessToken();

      const timestamp = new Date()
        .toISOString()
        .replace(/[^0-9]/g, "")
        .slice(0, 14);
      const password = Buffer.from(
        `${DARAJA_BUSINESS_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`
      ).toString("base64");

      const payload = {
        BusinessShortCode: DARAJA_BUSINESS_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount), // Ensure integer
        PartyA: phone, // Phone sending money
        PartyB: DARAJA_BUSINESS_SHORTCODE, // Shortcode receiving money
        PhoneNumber: phone,
        CallBackURL: DARAJA_CALLBACK_URL,
        AccountReference: `Order ${orderId.slice(0, 8)}`, // Max 12 chars usually
        TransactionDesc: `Payment for Order ${orderId}`,
      };

      console.log("Sending Daraja STK Push:", {
        ...payload,
        Password: "REDACTED",
      });

      const response = await axios.post(STK_URL, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.ResponseCode === "0") {
        return {
          success: true,
          reference: response.data.CheckoutRequestID,
          message: response.data.CustomerMessage,
        };
      } else {
        return {
          success: false,
          error: response.data.errorMessage || "STK Push failed",
        };
      }
    } catch (error: any) {
      console.error("Daraja STK Error:", error.response?.data || error.message);
      return {
        success: false,
        error:
          error.response?.data?.errorMessage ||
          "Failed to initiate M-Pesa payment",
      };
    }
  }

  /**
   * Query STK Push payment status
   */
  static async querySTKStatus(checkoutRequestID: string): Promise<{
    success: boolean;
    status?: "pending" | "success" | "failed" | "cancelled";
    message?: string;
    error?: string;
    receiptNumber?: string;
  }> {
    try {
      if (
        !DARAJA_CONSUMER_KEY ||
        !DARAJA_CONSUMER_SECRET ||
        !DARAJA_PASSKEY ||
        !DARAJA_BUSINESS_SHORTCODE
      ) {
        console.error("Missing Daraja Environment Variables");
        return {
          success: false,
          error: "Payment configuration missing (Daraja)",
        };
      }

      const token = await this.getAccessToken();

      const timestamp = new Date()
        .toISOString()
        .replace(/[^0-9]/g, "")
        .slice(0, 14);
      const password = Buffer.from(
        `${DARAJA_BUSINESS_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`
      ).toString("base64");

      const payload = {
        BusinessShortCode: DARAJA_BUSINESS_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      };

      console.log("Querying Daraja STK Status:", {
        CheckoutRequestID: checkoutRequestID,
      });

      const response = await axios.post(STK_QUERY_URL, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Check if API call was successful (ResponseCode)
      if (response.data.ResponseCode !== "0") {
        // API call failed
        return {
          success: false,
          error:
            response.data.ResponseDescription ||
            "Failed to query payment status",
        };
      }

      // API call successful, now check payment result (ResultCode)
      // ResultCode values:
      // 0 = Payment successful
      // 1032 = Request cancelled by user
      // 1037 = Timeout waiting for user input
      // Other codes = Various errors

      const resultCode = String(response.data.ResultCode || "");

      if (resultCode === "0") {
        // Payment successful
        // Extract receipt number from ResultDesc if available
        const resultDesc = response.data.ResultDesc || "";
        const receiptNumber = resultDesc.match(/[A-Z0-9]{10,}/)?.[0];

        return {
          success: true,
          status: "success",
          message: resultDesc || "Payment successful",
          receiptNumber: receiptNumber || undefined,
        };
      } else if (resultCode === "1032") {
        // User cancelled
        return {
          success: true,
          status: "cancelled",
          message: response.data.ResultDesc || "Payment cancelled by user",
        };
      } else if (resultCode === "1037") {
        // Timeout - still pending
        return {
          success: true,
          status: "pending",
          message:
            response.data.ResultDesc || "Waiting for user to complete payment",
        };
      } else {
        // Other error codes - payment failed
        return {
          success: true,
          status: "failed",
          message: response.data.ResultDesc || "Payment failed",
        };
      }
    } catch (error: any) {
      console.error(
        "Daraja STK Query Error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.errorMessage ||
          "Failed to query M-Pesa payment status",
      };
    }
  }
}
