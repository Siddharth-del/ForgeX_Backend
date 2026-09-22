import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as adminService from '../services/adminService';
import * as productService from '../services/productService';
import { catalogKeys } from './useCatalog';

export const adminKeys = { orders: ['admin', 'orders'], coupons: ['admin', 'coupons'] };

export const useAdminOrders = () => useQuery({ queryKey: adminKeys.orders, queryFn: adminService.getAllOrders, staleTime: 10_000 });
export const useCoupons = () => useQuery({ queryKey: adminKeys.coupons, queryFn: adminService.getCoupons });

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => adminService.updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.orders }),
  });
}

export function useProductMutations() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: catalogKeys.all });
  return {
    create: useMutation({ mutationFn: productService.createProduct, onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, values }) => productService.updateProduct(id, values), onSuccess: refresh }),
    remove: useMutation({ mutationFn: productService.deleteProduct, onSuccess: refresh }),
    uploadImage: useMutation({ mutationFn: ({ id, file }) => productService.uploadProductImage(id, file), onSuccess: refresh }),
  };
}

export function useCouponMutations() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: adminKeys.coupons });
  return {
    create: useMutation({ mutationFn: adminService.createCoupon, onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, values }) => adminService.updateCoupon(id, values), onSuccess: refresh }),
    deactivate: useMutation({ mutationFn: adminService.deactivateCoupon, onSuccess: refresh }),
  };
}
