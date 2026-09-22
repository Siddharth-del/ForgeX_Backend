import { discountPercent } from '../utils/format';

// Keep backend field names out of components. Every API object passes through here.

export function mapProduct(p) {
  if (!p) return null;
  const mrp = p.mrp ?? null;
  const price = p.price ?? null;
  return {
    id: p.productId,
    name: p.name ?? '',
    slug: p.slug ?? '',
    description: p.description ?? '',
    category: p.category ?? null,
    gender: p.gender ?? null,
    family: p.fragranceFamily ?? null,
    mrp,
    price,
    discount: typeof p.discount === 'number' ? p.discount : discountPercent(mrp, price),
    stock: typeof p.stock === 'number' ? p.stock : 0,
    image: p.image ?? null,
    active: p.active !== false,
  };
}

/** Form values → ProductDTO body. */
export function toProductDTO(v) {
  return {
    name: v.name.trim(),
    slug: v.slug.trim(),
    description: v.description?.trim() || null,
    category: v.category || null,
    gender: v.gender || null,
    fragranceFamily: v.family || null,
    mrp: v.mrp,
    price: v.price,
    stock: v.stock,
    image: v.image ?? null, // sent back unchanged so updates don't clear it
    active: v.active,
  };
}

export function mapPage(res) {
  return {
    items: (res?.content ?? []).map(mapProduct),
    page: res?.pageNumber ?? 0,
    pageSize: res?.pageSize ?? 0,
    total: res?.totalElements ?? 0,
    totalPages: res?.totalPages ?? 0,
    last: res?.lastPage ?? true,
  };
}

/**
 * CartDTO today is { cartId, totalPrice (rupees, Double), products: ProductDTO[] }.
 * ProductDTO has no quantity field, so each entry counts as one unit and repeated
 * products are grouped. If the backend adds `quantity` per product, it is used.
 */
export function mapCart(c) {
  if (!c) return { id: null, lines: [], count: 0, subtotal: 0 };
  const byId = new Map();
  for (const raw of c.products ?? []) {
    const product = mapProduct(raw);
    const qty = Number.isInteger(raw.quantity) && raw.quantity > 0 ? raw.quantity : 1;
    const line = byId.get(product.id);
    if (line) line.quantity += qty;
    else byId.set(product.id, { product, quantity: qty });
  }
  const lines = [...byId.values()].map((l) => ({ ...l, lineTotal: (l.product.price ?? 0) * l.quantity }));
  return {
    id: c.cartId ?? null,
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
  };
}

export function mapAddress(a) {
  if (!a) return null;
  return {
    id: a.addressId,
    street: a.street ?? '',
    buildingName: a.buildingName ?? '',
    city: a.city ?? '',
    state: a.state ?? '',
    country: a.country ?? '',
    pincode: a.pincode ?? '',
  };
}

export const toAddressDTO = (v) => ({
  street: v.street.trim(),
  buildingName: v.buildingName.trim(),
  city: v.city.trim(),
  state: v.state.trim(),
  country: v.country.trim(),
  pincode: v.pincode.trim(),
});

export function mapPrice(p) {
  if (!p) return null;
  return {
    subtotal: p.subtotal ?? 0,
    mrpTotal: p.mrpTotal ?? 0,
    productSavings: p.productSavings ?? 0,
    couponDiscount: p.couponDiscount ?? 0,
    couponCode: p.couponCode ?? null,
    couponMessage: p.couponMessage ?? null,
    shipping: p.shipping ?? 0,
    total: p.total ?? 0,
  };
}

export function mapOrder(o) {
  if (!o) return null;
  return {
    id: o.orderId,
    email: o.email,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    subtotal: o.subtotal ?? 0,
    discount: o.discount ?? 0,
    shipping: o.shipping ?? 0,
    total: o.total ?? 0,
    couponCode: o.couponCode ?? null,
    addressId: o.addressId ?? null,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    items: (o.orderItems ?? []).map((i) => ({
      id: i.orderItemId,
      productId: i.productId,
      name: i.productName,
      quantity: i.quantity ?? 0,
      unitPrice: i.unitPrice ?? 0,
      mrp: i.mrp ?? null,
      lineTotal: i.lineTotal ?? 0,
    })),
  };
}

export function mapUser(u) {
  if (!u) return null;
  const roles = u.roles ?? [];
  return {
    id: u.id,
    username: u.username ?? '',
    email: u.email ?? '',
    roles,
    isAdmin: roles.includes('ROLE_ADMIN'),
  };
}

export function mapCoupon(c) {
  if (!c) return null;
  return {
    id: c.couponId,
    code: c.code,
    type: c.type,
    value: c.value,
    minOrderPaise: c.minOrderPaise ?? null,
    maxDiscountPaise: c.maxDiscountPaise ?? null,
    usageLimit: c.usageLimit ?? null,
    usedCount: c.usedCount ?? 0,
    validFrom: c.validFrom ?? null,
    validTo: c.validTo ?? null,
    active: c.active !== false,
  };
}
