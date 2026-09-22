import apiClient from './apiClient';
import { mapPrice } from './mappers';

// Endpoints: CheckoutController. All money is computed by the server.

export async function previewCheckout(couponCode) {
  const { data } = await apiClient.get('/api/checkout/preview', {
    params: couponCode ? { coupon: couponCode } : {},
  });
  return mapPrice(data);
}

/** body: { addressId, paymentMethod: 'RAZORPAY' | 'COD', couponCode? } */
export async function placeOrder({ addressId, paymentMethod, couponCode }) {
  const { data } = await apiClient.post('/api/checkout', {
    addressId,
    paymentMethod,
    couponCode: couponCode || null,
  });
  return {
    orderId: data.orderId,
    status: data.status,
    price: mapPrice(data.price),
    razorpay: data.razorpayOrderId
      ? {
          keyId: data.razorpayKeyId,
          orderId: data.razorpayOrderId,
          amount: data.amount,
          currency: data.currency,
          email: data.customerEmail,
        }
      : null,
  };
}

/** Forward Razorpay's handler response unchanged (razorpay_* field names). */
export async function verifyPayment(response) {
  const { data } = await apiClient.post('/api/payments/verify', {
    razorpay_order_id: response.razorpay_order_id,
    razorpay_payment_id: response.razorpay_payment_id,
    razorpay_signature: response.razorpay_signature,
  });
  return { orderId: data.orderId, status: data.status };
}
