# M-Pesa Sandbox Integration Setup

## Environment Variables Required

Add the following environment variables to your `.env.local` file:

```env
# M-Pesa Daraja API Credentials (Sandbox)
DARAJA_CONSUMER_KEY=2pne81ss3Cq2BS7BMvXa2yeO7rB9Tzen
DARAJA_CONSUMER_SECRET=nUFDPxsF1bcAdL97
DARAJA_PASSKEY=your_passkey_here
DARAJA_BUSINESS_SHORTCODE=174379
DARAJA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/payments/callback/mpesa
```

**Note**: You still need to get the `DARAJA_PASSKEY` from the Safaricom Developer Portal. The Consumer Key and Consumer Secret provided above are for sandbox testing.

## Getting Sandbox Credentials

1. **Register at Safaricom Developer Portal**:
   - Visit https://developer.safaricom.co.ke
   - Create an account and log in

2. **Create an App**:
   - Go to "My Apps" section
   - Create a new app
   - You'll receive:
     - **Consumer Key**
     - **Consumer Secret**

3. **Get Sandbox Credentials**:
   - In the developer portal, navigate to "Sandbox" section
   - You'll find:
     - **Passkey** (also called Lipa na M-Pesa Online Passkey)
     - **Business Shortcode** (usually `174379` for sandbox)

## Setting Up ngrok for Local Testing

1. **Install ngrok**:
   ```bash
   # Download from https://ngrok.com/download
   # Or use package manager
   npm install -g ngrok
   ```

2. **Start your Next.js development server**:
   ```bash
   npm run dev
   ```

3. **Start ngrok**:
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL**:
   - ngrok will provide a URL like: `https://abc123.ngrok.io`
   - Update `DARAJA_CALLBACK_URL` in `.env.local`:
     ```
     DARAJA_CALLBACK_URL=https://abc123.ngrok.io/api/payments/callback/mpesa
     ```

5. **Important**: Each time you restart ngrok, you'll get a new URL. Update your `.env.local` accordingly.

## Testing

### Test Phone Numbers
Use Safaricom sandbox test numbers (format: 254708374149). You can find test numbers in the Safaricom Developer Portal.

### Test Scenarios
1. **Successful Payment**: Enter PIN when prompted
2. **Cancelled Payment**: Cancel the STK push prompt
3. **Insufficient Funds**: Use a test number with insufficient balance

## Production Setup

When moving to production:

1. **Apply for Production Credentials**:
   - Contact Safaricom to get production credentials
   - You'll need to provide business registration documents

2. **Update Environment Variables**:
   - Replace sandbox credentials with production credentials
   - Update `DARAJA_CALLBACK_URL` to your production domain
   - Set `NODE_ENV=production`

3. **Register Callback URL**:
   - Register your production callback URL with Safaricom
   - The URL must be HTTPS and publicly accessible

## Features Implemented

✅ M-Pesa STK Push initiation
✅ Callback webhook handler for payment confirmations
✅ STK Query API for checking payment status (matches Safaricom documentation)
✅ Payment status polling on checkout page
✅ Automatic order status updates
✅ Transaction record creation
✅ Inventory management (reserve/deduct/release)

## STK Query Implementation Details

The STK Query implementation follows the Safaricom documentation exactly:

**Request Format**:
- Endpoint: `https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query`
- Method: POST
- Headers: Authorization Bearer token, Content-Type: application/json
- Body: `{ BusinessShortCode, Password, Timestamp, CheckoutRequestID }`

**Response Handling**:
- Checks `ResponseCode` first (API call success)
- Then checks `ResultCode` for payment status:
  - `0` = Payment successful
  - `1032` = Cancelled by user
  - `1037` = Timeout/pending
  - Other = Failed
- Uses `ResultDesc` for payment result messages

## API Endpoints

- `POST /api/payments/initiate` - Initiate M-Pesa payment
- `POST /api/payments/callback/mpesa` - Webhook for Safaricom callbacks
- `POST /api/payments/status` - Check payment status (for polling)

