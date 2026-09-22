import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as cartService from '../services/cartService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../utils/errors';

export const cartKey = ['me', 'cart'];

const UNAVAILABLE_MSG = 'The cart is not available on the server yet. Please try again later.';

export function useCart() {
  const { isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: cartKey,
    queryFn: cartService.getCart,
    enabled: isAuthenticated,
    retry: (count, err) => !cartService.isCartUnavailable(err) && err?.response?.status !== 401 && count < 1,
    staleTime: 15_000,
  });
  return { ...query, unavailable: cartService.isCartUnavailable(query.error) };
}

function useCartMutation(fn, successMsg) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      if (data && typeof data === 'object' && 'lines' in data) qc.setQueryData(cartKey, data);
      else qc.invalidateQueries({ queryKey: cartKey });
      if (successMsg) toast.success(successMsg);
    },
    onError: (err) => {
      toast.error(cartService.isCartUnavailable(err) ? UNAVAILABLE_MSG : errorMessage(err, 'Could not update your cart.'));
      qc.invalidateQueries({ queryKey: cartKey });
    },
  });
}

export const useAddToCart = () =>
  useCartMutation(({ productId, quantity }) => cartService.addToCart(productId, quantity), 'Added to cart.');
export const useIncrement = () => useCartMutation((productId) => cartService.increment(productId));
export const useDecrement = () => useCartMutation((productId) => cartService.decrement(productId));
export const useRemoveFromCart = () =>
  useCartMutation(({ cartId, productId }) => cartService.removeFromCart(cartId, productId), 'Removed from cart.');
