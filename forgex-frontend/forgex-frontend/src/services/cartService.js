import apiClient from './apiClient';
import { mapCart } from './mappers';

// Endpoints: CartController, exactly as they exist in the backend today.
// NOTE: CartServiceImpl in the backend is currently unimplemented (every method
// throws UnsupportedOperationException → HTTP 500). The UI reports this plainly
// via isCartUnavailable() instead of simulating a cart.

export async function getCart() {
  const { data } = await apiClient.get('/api/carts/users/cart');
  return mapCart(data);
}

export async function addToCart(productId, quantity = 1) {
  const { data } = await apiClient.post(`/api/carts/products/${productId}/quantity/${quantity}`);
  return mapCart(data);
}

/** Backend: any operation other than "delete" adds one; "delete" removes one. */
export async function increment(productId) {
  const { data } = await apiClient.put(`/api/cart/products/${productId}/quantity/add`);
  return mapCart(data);
}

export async function decrement(productId) {
  const { data } = await apiClient.put(`/api/cart/products/${productId}/quantity/delete`);
  return mapCart(data);
}

export async function removeFromCart(cartId, productId) {
  const { data } = await apiClient.delete(`/api/carts/${cartId}/product/${productId}`);
  return data; // status message string
}

/** The cart endpoints fail with a bare 500 while the service is unimplemented. */
export const isCartUnavailable = (error) => error?.response?.status === 500;
