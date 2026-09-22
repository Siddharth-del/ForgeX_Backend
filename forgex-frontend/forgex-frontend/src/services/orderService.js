import apiClient from './apiClient';
import { mapOrder } from './mappers';

// Endpoints: OrderController (customer)

export async function getMyOrders() {
  const { data } = await apiClient.get('/api/orders');
  return (data ?? []).map(mapOrder);
}

export async function getMyOrder(id) {
  const { data } = await apiClient.get(`/api/orders/${id}`);
  return mapOrder(data);
}
