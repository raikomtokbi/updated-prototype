# XYZPay Payment Gateway Integration

This document describes how to set up and use the XYZPay payment gateway integration in the Nexcoin CMS.

## Overview

The XYZPay integration allows users to make payments through the XYZPay platform. The system automatically:
- Creates payment orders via XYZPay API
- Redirects users to the payment page
- Verifies payment status via webhooks
- Updates order status upon successful payment
- Triggers order processing (e.g., game top-ups)

## Setup Instructions

### 1. Get XYZPay API Token

1. Log in to your XYZPay dashboard at https://www.xyzpay.site/
2. Navigate to Settings → API Credentials
3. Copy your API Token

### 2. Set Environment Variable

Add the XYZPay API token to your environment:

```bash
# For Replit
export XYZPAY_API_TOKEN=your_api_token_here
```

Or add to your `.env` file:
```
XYZPAY_API_TOKEN=your_api_token_here
```

### 3. Add XYZPay Payment Method to Database

Use the admin panel to add XYZPay as an active payment method:

1. Go to Admin Panel → Payment Methods
2. Click "Add Payment Method"
3. Fill in the details:
   - **Name**: XYZPay
   - **Type**: xyzpay
   - **Provider**: xyzpay
   - **Secret Key**: Your XYZPay API token (or set via environment variable)
   - **Mode**: test (for testing) or live (for production)
   - **Is Active**: ✓ Check this box
4. Click Save

### 4. Configure Webhook in XYZPay Dashboard

1. Go to XYZPay Dashboard → Settings → Webhooks
2. Add a new webhook with:
   - **URL**: `https://yourdomain.com/api/xyzpay/webhook`
   - **Method**: POST
   - **Events**: Order Status Change

## Architecture

### Files Created/Modified

1. **server/lib/paymentGateways/xyzpay.ts** (NEW)
   - Implements the XYZPay gateway handler
   - Handles order creation and payment verification
   - Follows the standard PaymentGatewayHandler interface

2. **server/lib/paymentGateways/index.ts** (MODIFIED)
   - Added XYZPay to the list of supported gateways

3. **server/routes.ts** (MODIFIED)
   - Added `/api/xyzpay/webhook` route for handling payment callbacks

4. **server/storage.ts** (MODIFIED)
   - Added `getOrderById()` method for retrieving orders by ID

## Payment Flow

### User Initiates Payment

```
1. User clicks "Pay Now" in checkout
2. Frontend calls /api/payment/initiate with xyzpay method
3. Backend creates XYZPay order via API
4. XYZPay returns payment_url
5. User is redirected to payment_url
```

### Payment Processing

```
1. User completes payment on XYZPay
2. XYZPay calls /api/xyzpay/webhook with order_id
3. Backend verifies payment status via XYZPay API
4. If COMPLETED:
   - Order status updated to "completed"
   - Order processing triggered (game top-up, etc.)
5. Webhook returns success response
```

## API Integration Details

### Create Order (XYZPay API)

```
POST https://www.xyzpay.site/api/create-order
Content-Type: application/x-www-form-urlencoded

Parameters:
- customer_mobile: Customer's phone number
- user_token: Your XYZPay API token
- amount: Order amount
- order_id: Unique order ID from our system
- redirect_url: Webhook URL
- remark1: "nexcoin"
- remark2: Product description
```

### Check Order Status (XYZPay API)

```
POST https://www.xyzpay.site/api/check-order-status
Content-Type: application/x-www-form-urlencoded

Parameters:
- user_token: Your XYZPay API token
- order_id: Order ID to verify

Response:
{
  "status": "COMPLETED" | "FAILED" | "PENDING",
  "message": "...",
  "result": {
    "txnStatus": "COMPLETED" | "FAILED",
    "orderId": "...",
    "amount": "...",
    "date": "2024-01-12 13:22:08",
    "utr": "Transaction reference"
  }
}
```

## Security

- **Webhook Verification**: Payment status is verified with XYZPay API before updating orders
- **Amount Validation**: Order amounts are checked against database records
- **Error Handling**: Failed payments are logged and reported
- **API Token**: Stored securely in environment variables, not in code

## Testing

### Test Payment Flow

1. Add XYZPay payment method in admin panel (mode: test)
2. Place an order with a test amount
3. Proceed to checkout and select XYZPay
4. Complete payment on XYZPay test page
5. Verify webhook is called
6. Check order status changed to "completed"

### Webhook Testing

You can test the webhook manually:

```bash
curl -X POST http://localhost:5000/api/xyzpay/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "your_order_id",
    "status": "COMPLETED"
  }'
```

## Error Handling

- **Missing API Token**: Error thrown during payment initiation
- **Order Not Found**: 404 response from webhook
- **Payment Verification Failed**: Order status remains unchanged, no error email sent
- **Network Errors**: Logged and returned to webhook as error response

## Support

For issues with XYZPay integration:
1. Check the logs: `npm run dev` output
2. Verify API token is correct
3. Confirm webhook URL is publicly accessible
4. Check XYZPay dashboard for error messages
5. Review order status in admin panel

## Production Deployment

When deploying to production:

1. Update environment variable with live API token:
   ```
   XYZPAY_API_TOKEN=your_live_api_token
   ```

2. Update payment method in admin panel:
   - Mode: Change from "test" to "live"
   - API Token: Update to production token

3. Configure webhook URL in XYZPay:
   - Change from test URL to production URL
   - Example: `https://nexcoin.example.com/api/xyzpay/webhook`

4. Test with small transaction before going live

## Monitoring

Monitor XYZPay payments through:
- **Admin Panel**: Payments → View transaction list
- **Orders**: Admin → TopUp Orders/Voucher Orders → Check status
- **Logs**: Backend logs show webhook calls and verification results

## Known Limitations

- Webhooks must be publicly accessible (test mode may require ngrok/tunneling)
- XYZPay API may have rate limits
- Payment verification depends on XYZPay API availability
