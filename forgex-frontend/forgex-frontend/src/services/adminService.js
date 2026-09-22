import apiClient from './apiClient';
import { mapCoupon, mapOrder } from './mappers';

// Endpoints: OrderController (admin) and CouponController (/api/admin/**).
// There are no admin user-management endpoints in the backend.

export async function getAllOrders() {
  const { data } = await apiClient.get('/api/admin/orders');
  return (data ?? []).map(mapOrder);
}

export async function updateOrderStatus(orderId, status) {
  const { data } = await apiClient.patch(`/api/admin/orders/${orderId}/status`, null, { params: { status } });
  return mapOrder(data);
}

export async function getCoupons() {
  const { data } = await apiClient.get('/api/admin/coupons');
  return (data ?? []).map(mapCoupon);
}

const toCouponDTO = (v) => ({
  code: v.code.trim().toUpperCase(),
  type: v.type,
  value: v.value,
  minOrderPaise: v.minOrderPaise ?? null,
  maxDiscountPaise: v.maxDiscountPaise ?? null,
  usageLimit: v.usageLimit ?? null,
  validFrom: v.validFrom || null,
  validTo: v.validTo || null,
  active: v.active,
});

export async function createCoupon(values) {
  const { data } = await apiClient.post('/api/admin/coupons', toCouponDTO(values));
  return mapCoupon(data);
}

export async function updateCoupon(id, values) {
  const { data } = await apiClient.put(`/api/admin/coupons/${id}`, toCouponDTO(values));
  return mapCoupon(data);
}

export async function deactivateCoupon(id) {
  await apiClient.delete(`/api/admin/coupons/${id}`);
}
