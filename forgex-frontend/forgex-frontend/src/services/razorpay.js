const SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let loading = null;

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => { loading = null; resolve(false); };
    document.body.appendChild(s);
  });
  return loading;
}

/**
 * Opens Razorpay Checkout. Resolves with the handler response on success.
 * Rejects with { dismissed: true, lastError } when the customer closes it.
 * A failed attempt keeps the modal open so the customer can retry.
 */
export function openRazorpay({ keyId, orderId, amount, currency, email, name, description, upiOnly = false }) {
  return new Promise((resolve, reject) => {
    let lastError = null;
    const options = {
      key: keyId,
      order_id: orderId,
      amount,
      currency,
      name: 'ForgeX',
      description,
      prefill: { email, name },
      theme: { color: '#C8102E' },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject({ dismissed: true, lastError }) },
    };

   if (upiOnly) {
  // UPI shown first; other methods stay available as a fallback
  options.config = {
    display: {
      blocks: {
        upi: {
          name: 'Pay using UPI',
          instruments: [{ method: 'upi' }],
        },
      },
      sequence: ['block.upi'],
      preferences: { show_default_blocks: true },   // was false
    },
  };
}

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (r) => { lastError = r?.error?.description || 'Payment failed'; });
    rzp.open();
  });

}
