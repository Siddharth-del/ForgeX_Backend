import { useQuery } from '@tanstack/react-query';
import * as orderService from '../services/orderService';

export const useMyOrders = () =>
  useQuery({ queryKey: ['me', 'orders'], queryFn: orderService.getMyOrders, staleTime: 15_000 });

export const useMyOrder = (id, { poll = false } = {}) =>
  useQuery({
    queryKey: ['me', 'orders', String(id)],
    queryFn: () => orderService.getMyOrder(id),
    retry: (count, err) => err?.response?.status !== 404 && count < 1,
    // While payment is pending, re-check so a webhook confirmation shows up.
    refetchInterval: (q) => (poll && q.state.data?.status === 'PENDING_PAYMENT' ? 5000 : false),
  });
