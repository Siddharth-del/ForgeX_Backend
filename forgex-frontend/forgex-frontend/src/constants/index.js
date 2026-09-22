// Values mirror the backend enums in com.example.ForgeX.model. Keep them in sync.

export const CATEGORIES = [
  { value: 'PERFUME', label: 'Perfume' },
  { value: 'ATTAR', label: 'Attar' },
];

export const GENDERS = [
  { value: 'MEN', label: 'Men' },
  { value: 'WOMEN', label: 'Women' },
  { value: 'UNISEX', label: 'Unisex' },
];

export const FRAGRANCE_FAMILIES = [
  { value: 'AMBER', label: 'Amber' },
  { value: 'AQUATIC', label: 'Aquatic' },
  { value: 'AROMATIC', label: 'Aromatic' },
  { value: 'EARTHY', label: 'Earthy' },
  { value: 'FLORAL', label: 'Floral' },
  { value: 'MIXED', label: 'Mixed' },
  { value: 'WOODY', label: 'Woody' },
];

export const ORDER_STATUS = {
  PENDING_PAYMENT: { label: 'Awaiting payment', tone: 'warn' },
  PAID: { label: 'Paid', tone: 'ok' },
  CONFIRMED: { label: 'Confirmed', tone: 'ok' },
  SHIPPED: { label: 'Shipped', tone: 'info' },
  DELIVERED: { label: 'Delivered', tone: 'ok' },
  CANCELLED: { label: 'Cancelled', tone: 'muted' },
  REFUNDED: { label: 'Refunded', tone: 'muted' },
};

export const PAYMENT_STATUS = {
  CREATED: 'Not paid yet',
  CAPTURED: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
  PENDING_COD: 'Pay on delivery',
};

export const PAYMENT_METHODS = {
  UPI: 'UPI (scan QR or enter UPI ID)',
  RAZORPAY: 'Card, net banking or wallet',
  COD: 'Cash on delivery',
};

// Mirrors OrderServiceImpl.ALLOWED on the backend. The backend still decides;
// this only keeps the admin UI from offering moves it will reject.
export const ADMIN_STATUS_TRANSITIONS = {
  PAID: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
};

export const DISCOUNT_TYPES = [
  { value: 'PERCENT', label: 'Percent off' },
  { value: 'FLAT', label: 'Flat amount off' },
];

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured', sortBy: 'productId', sortOrder: 'asc' },
  { value: 'newest', label: 'Newest', sortBy: 'productId', sortOrder: 'desc' },
  { value: 'price-asc', label: 'Price: low to high', sortBy: 'price', sortOrder: 'asc' },
  { value: 'price-desc', label: 'Price: high to low', sortBy: 'price', sortOrder: 'desc' },
  { value: 'name', label: 'Name A–Z', sortBy: 'name', sortOrder: 'asc' },
];

export const PAGE_SIZE = 12;
// Large enough to hold the whole ForgeX catalogue in one request. Used where the
// backend has no dedicated endpoint (product by id, multi-filter, admin table).
export const CATALOG_FETCH_SIZE = 500;


export const labelOf = (list, value) => list.find((o) => o.value === value)?.label ?? value ?? '';
