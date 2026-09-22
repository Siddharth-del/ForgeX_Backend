import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useCart, cartKey } from '../../hooks/useCart';
import { useAddresses, useAddressMutations } from '../../hooks/useAddresses';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { catalogKeys } from '../../hooks/useCatalog';
import * as checkoutService from '../../services/checkoutService';
import { loadRazorpay, openRazorpay } from '../../services/razorpay';
import AddressForm, { formatAddress } from '../../components/checkout/AddressForm';
import PriceSummary from '../../components/order/PriceSummary';
import ProductImage from '../../components/common/ProductImage';
import Button from '../../components/common/Button';
import { RowsSkeleton, Skeleton } from '../../components/common/Skeleton';
import { EmptyState, ErrorState, Notice } from '../../components/common/States';
import { PAYMENT_METHODS } from '../../constants';
import { errorMessage, parseApiError } from '../../utils/errors';
import { formatPaise } from '../../utils/format';

function Section({ step, title, children }) {
  return (
    <section className="border-b border-line py-8 first:pt-0">
      <h2 className="mb-5 flex items-baseline gap-3 text-2xl">
        <span className="font-display text-lg text-mist">{step}</span>{title}
      </h2>
      {children}
    </section>
  );
}

export default function CheckoutPage() {
  useDocumentTitle('Checkout');
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const cart = useCart();
  const addresses = useAddresses();
  const { create } = useAddressMutations();

  const [addressId, setAddressId] = useState(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState(null);
  const submittingRef = useRef(false);
 

  

  const preview = useQuery({
    queryKey: ['me', 'checkout-preview', coupon],
    queryFn: () => checkoutService.previewCheckout(coupon),
    enabled: Boolean(cart.data?.lines.length),
    placeholderData: (prev) => prev,
  });

  const addressList = addresses.data ?? [];
  const selectedAddressId = addressId ?? addressList[0]?.id ?? null;
  const showAddressForm = addingAddress || (addresses.isSuccess && addressList.length === 0);
  const couponRejected = coupon && preview.data && !preview.data.couponCode;

  const finish = (orderId, message) => {
    qc.invalidateQueries({ queryKey: cartKey });
    qc.invalidateQueries({ queryKey: ['me', 'orders'] });
    qc.invalidateQueries({ queryKey: catalogKeys.all });
    if (message) toast.success(message);
    navigate(`/orders/${orderId}?placed=1`, { replace: true });
  };

  const placeOrder = async () => {
    if (submittingRef.current) return; // guards against double clicks and re-renders
    setPlaceError(null);
    if (!selectedAddressId) { setPlaceError('Add a delivery address to continue.'); return; }
    if (couponRejected) { setPlaceError('Remove the coupon that could not be applied, or try another code.'); return; }

    submittingRef.current = true;
    setPlacing(true);
    try {
const order = await checkoutService.placeOrder({
  addressId: selectedAddressId,
  paymentMethod: paymentMethod === 'COD' ? 'COD' : 'RAZORPAY',
  couponCode: coupon || null,
});
      if (!order.razorpay) {
        finish(order.orderId, 'Order placed.');
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('The payment window could not load. Your order is saved; retry payment from your orders within 15 minutes.');
        finish(order.orderId);
        return;
      }

      try {
const response = await openRazorpay({  ...order.razorpay, name: user?.username,description: `Order #${order.orderId}`,upiOnly: paymentMethod === 'UPI',});        
const verified = await checkoutService.verifyPayment(response);
        finish(verified.orderId, verified.status === 'PAID' ? 'Payment received. Order placed.' : null);
      } catch (payErr) {
        if (payErr?.dismissed) {
          toast.info(payErr.lastError
            ? `Payment failed: ${payErr.lastError}. Your items are held for 15 minutes.`
            : 'Payment not completed. Your items are held for 15 minutes.');
          finish(order.orderId);
        } else {
          // Verification call failed. The webhook may still confirm the payment.
          toast.error('We could not confirm your payment yet. Check the order page in a minute before paying again.');
          finish(order.orderId);
        }
      }
    } catch (err) {
      const { message } = parseApiError(err, 'Your order could not be placed. Please try again.');
      setPlaceError(message);
      qc.invalidateQueries({ queryKey: ['me', 'checkout-preview'] });
    } finally {
      submittingRef.current = false;
      setPlacing(false);
    }
  };

  // ----- page states -----
  if (cart.isLoading) return <div className="page py-10"><RowsSkeleton rows={4} className="h-24" /></div>;
  if (cart.unavailable) {
    return (
      <div className="page py-10">
        <Notice title="Checkout is not available yet" tone="warn">The store's cart service is still being set up on the server, so orders can't be placed right now.</Notice>
      </div>
    );
  }
  if (cart.isError) return <div className="page py-10"><ErrorState message={errorMessage(cart.error)} onRetry={cart.refetch} /></div>;
  if (!cart.data?.lines.length) {
    return <div className="page py-16"><EmptyState title="Your cart is empty" body="Add a fragrance before checking out." action="Shop fragrances" actionTo="/products" /></div>;
  }

  const price = preview.data;

  return (
    <div className="page py-10">
      <h1 className="text-3xl sm:text-4xl">Checkout</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <Section step="1" title="Contact">
            <p className="text-[15px]">{user?.username && <span className="font-medium">{user.username}, </span>}{user?.email}</p>
            <p className="mt-1 text-sm text-steel">Your order is linked to this account. Track it anytime under Orders.</p>
          </Section>

          <Section step="2" title="Delivery address">
            {addresses.isLoading ? <RowsSkeleton rows={2} className="h-16" />
              : addresses.isError ? <ErrorState message={errorMessage(addresses.error)} onRetry={addresses.refetch} />
              : (
                <>
                  {addressList.length > 0 && !addingAddress && (
                    <fieldset>
                      <legend className="sr-only">Choose a delivery address</legend>
                      <div className="space-y-3">
                        {addressList.map((a) => (
                          <label key={a.id} className={`flex cursor-pointer gap-3 border p-4 ${selectedAddressId === a.id ? 'border-ink' : 'border-line hover:border-steel'}`}>
                            <input type="radio" name="address" className="mt-1 h-4 w-4 accent-ink" checked={selectedAddressId === a.id} onChange={() => setAddressId(a.id)} />
                            <span className="text-[15px]">{formatAddress(a)}</span>
                          </label>
                        ))}
                      </div>
                      <Button variant="ghost" size="sm" className="mt-3 -ml-3" onClick={() => setAddingAddress(true)}>Add a new address</Button>
                    </fieldset>
                  )}
                  {showAddressForm && (
                    <AddressForm submitLabel="Use this address"
                      onCancel={addressList.length ? () => setAddingAddress(false) : undefined}
                      onSubmit={async (values) => {
                        const created = await create.mutateAsync(values);
                        setAddressId(created.id);
                        setAddingAddress(false);
                        toast.success('Address saved.');
                      }} />
                  )}
                </>
              )}
          </Section>

          <Section step="3" title="Payment">
            <fieldset>
              <legend className="sr-only">Payment method</legend>
              <div className="space-y-3">
                {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-3 border p-4 ${paymentMethod === value ? 'border-ink' : 'border-line hover:border-steel'}`}>
                    <input type="radio" name="payment" value={value} className="h-4 w-4 accent-ink" checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} />
                    <span className="text-[15px]">{label}</span>
                  </label>
                ))}
              </div>
              {paymentMethod === 'RAZORPAY' && <p className="mt-3 text-sm text-steel">You'll complete payment in a secure Razorpay window. Card details never reach ForgeX.</p>}
            </fieldset>
          </Section>
        </div>

        <aside className="h-fit border border-line p-6 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 className="text-xl">Order summary</h2>
          <ul className="mt-4 space-y-4">
            {cart.data.lines.map(({ product, quantity, lineTotal }) => (
              <li key={product.id} className="flex gap-3">
                <div className="w-14 shrink-0"><ProductImage src={product.image} alt="" /></div>
                <div className="min-w-0 flex-1 text-[15px]">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-sm text-steel">Qty {quantity}</p>
                </div>
                <p className="price shrink-0">{formatPaise(lineTotal)}</p>
              </li>
            ))}
          </ul>

          <form className="mt-6 border-t border-line pt-5" onSubmit={(e) => { e.preventDefault(); setCoupon(couponInput.trim().toUpperCase()); }}>
            <label htmlFor="coupon" className="field-label">Coupon code</label>
            <div className="flex gap-2">
              <input id="coupon" className="input uppercase" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Enter code" autoComplete="off" />
              {coupon
                ? <Button variant="outline" onClick={() => { setCoupon(''); setCouponInput(''); }}>Remove</Button>
                : <Button type="submit" variant="outline" disabled={!couponInput.trim()}>Apply</Button>}
            </div>
            {coupon && price && (
              <p className={`mt-2 text-sm ${price.couponCode ? 'text-ok' : 'text-forge'}`} role="status">
                {price.couponCode ? `${price.couponCode} applied.` : price.couponMessage || 'This coupon could not be applied.'}
              </p>
            )}
          </form>

          <div className="mt-5 border-t border-line pt-4">
            {preview.isLoading ? <Skeleton className="h-32 w-full" />
              : preview.isError ? <p className="text-sm text-forge">{errorMessage(preview.error, 'Totals could not be calculated.')}</p>
              : price && <PriceSummary {...price} />}
          </div>

          {placeError && <p role="alert" className="mt-4 border border-forge/30 bg-forge-tint px-3 py-2 text-[15px] text-forge">{placeError}</p>}

          <Button variant="accent" className="mt-5 w-full" loading={placing} disabled={!price || preview.isFetching || showAddressForm} onClick={placeOrder}>
            {paymentMethod === 'COD' ? 'Place order' : `Pay ${price ? formatPaise(price.total) : ''}`}
          </Button>
          <Link to="/cart" className="mt-3 block text-center text-[15px] link">Back to cart</Link>
        </aside>
      </div>
    </div>
  );
}
