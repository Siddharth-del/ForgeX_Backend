import apiClient from './apiClient';
import { mapAddress, toAddressDTO } from './mappers';

// Endpoints: AddressController

export async function getMyAddresses() {
  const { data } = await apiClient.get('/api/users/addresses');
  return (data ?? []).map(mapAddress);
}

export async function createAddress(values) {
  const { data } = await apiClient.post('/api/addresses', toAddressDTO(values));
  return mapAddress(data);
}

export async function updateAddress(id, values) {
  const { data } = await apiClient.put(`/api/addresses/${id}`, toAddressDTO(values));
  return mapAddress(data);
}

export async function deleteAddress(id) {
  const { data } = await apiClient.delete(`/api/addresses/${id}`);
  return data;
}
