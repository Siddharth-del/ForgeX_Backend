import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as addressService from '../services/addressService';

export const addressKey = ['me', 'addresses'];

export function useAddresses() {
  return useQuery({ queryKey: addressKey, queryFn: addressService.getMyAddresses, staleTime: 60_000 });
}

export function useAddressMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: addressKey });
  return {
    create: useMutation({ mutationFn: addressService.createAddress, onSuccess: done }),
    update: useMutation({ mutationFn: ({ id, values }) => addressService.updateAddress(id, values), onSuccess: done }),
    remove: useMutation({ mutationFn: addressService.deleteAddress, onSuccess: done }),
  };
}
