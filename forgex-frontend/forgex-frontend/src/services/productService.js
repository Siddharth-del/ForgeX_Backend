import apiClient, { accept302 } from './apiClient';
import { mapPage, mapProduct, toProductDTO } from './mappers';
import { CATALOG_FETCH_SIZE } from '../constants';

// Endpoints: ProductController. The backend filters by ONE of keyword, category
// or gender per request; there is no product-by-id or price/family filter.

const pageParams = ({ page = 0, size = 12, sortBy = 'productId', sortOrder = 'asc' } = {}) => ({
  pageNumber: page,
  pageSize: size,
  sortBy,
  sortOrder,
});

export async function getProducts(opts) {
  const { data } = await apiClient.get('/api/public/products', { params: pageParams(opts) });
  return mapPage(data);
}

export async function searchProducts(keyword, opts) {
  const { data } = await apiClient.get(`/api/public/products/keyword/${encodeURIComponent(keyword)}`, {
    params: pageParams(opts),
    ...accept302,
  });
  return mapPage(data);
}

export async function getProductsByCategory(category, opts) {
  const { data } = await apiClient.get(`/api/public/products/category/${encodeURIComponent(category)}`, {
    params: pageParams(opts),
    ...accept302,
  });
  return mapPage(data);
}

export async function getProductsByGender(gender, opts) {
  const { data } = await apiClient.get(`/api/public/products/gender/${encodeURIComponent(gender)}`, {
    params: pageParams(opts),
    ...accept302,
  });
  return mapPage(data);
}

/** Whole catalogue in one request (small catalogue). */
export async function getCatalog() {
  const res = await getProducts({ page: 0, size: CATALOG_FETCH_SIZE, sortBy: 'productId', sortOrder: 'asc' });
  return res.items;
}

/** No GET-by-id endpoint exists, so look the product up in the catalogue. */
export async function getProductById(id, catalog) {
  const items = catalog ?? (await getCatalog());
  return items.find((p) => String(p.id) === String(id)) ?? null;
}

// ---------- Admin ----------

export async function createProduct(values) {
  const { data } = await apiClient.post('/api/admin/products', toProductDTO(values));
  return mapProduct(data);
}

export async function updateProduct(id, values) {
  const { data } = await apiClient.put(`/api/admin/products/${id}`, toProductDTO(values));
  return mapProduct(data);
}

/** Note: the backend currently exposes delete under /api/public/**. */
export async function deleteProduct(id) {
  const { data } = await apiClient.delete(`/api/public/products/${id}`);
  return data;
}

export async function uploadProductImage(id, file) {
  const form = new FormData();
  form.append('image', file);
  const { data } = await apiClient.put(`/api/admin/products/${id}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return mapProduct(data);
}
