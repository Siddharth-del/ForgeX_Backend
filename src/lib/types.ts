/**
 * Types mirror the Spring Boot DTOs in com.example.ForgeX.dto one-to-one.
 * All money values are integers in paise, exactly as the backend sends them.
 */

export type Category = "ATTAR" | "PERFUME";
export type Gender = "MEN" | "WOMEN" | "UNISEX";
export type FragranceFamily = "AMBER" | "AQUATIC" | "AROMATIC" | "EARTHY" | "FLORAL" | "MIXED" | "WOODY";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";
export type PaymentMethod = "RAZORPAY" | "COD" | "UPI";
export type PaymentStatus = "CREATED" | "CAPTURED" | "FAILED" | "REFUNDED" | "PENDING_COD";
export type DiscountType = "PERCENT" | "FLAT";
export type Role = "ROLE_USER" | "ROLE_ADMIN";

export interface Product {
  productId: number;
  name: string;
  slug: string;
  description: string | null;
  category: Category | null;
  gender: Gender | null;
  fragranceFamily: FragranceFamily | null;
  /** Only present in cart responses */
  quantity: number | null;
  mrp: number | null;
  price: number;
  discount: number | null;
  stock: number | null;
  image: string | null;
  active: boolean | null;
}

export interface ProductPage {
  content: Product[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  lastPage: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  roles: Role[];
  jwtToken: string | null;
}

export interface Cart {
  cartId: number;
  /** paise, as a double on the backend */
  totalPrice: number;
  products: Product[];
}

export interface Address {
  addressId?: number;
  street: string;
  buildingName: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phoneNumber: string;
}

export interface PriceBreakdown {
  subtotal: number;
  mrpTotal: number;
  productSavings: number;
  couponDiscount: number;
  couponCode: string | null;
  couponMessage: string | null;
  shipping: number;
  total: number;
}

export interface CheckoutRequest {
  addressId: number;
  paymentMethod: PaymentMethod;
  couponCode?: string;
}

export interface CheckoutResponse {
  orderId: number;
  status: OrderStatus;
  price: PriceBreakdown | null;
  razorpayKeyId: string | null;
  razorpayOrderId: string | null;
  amount: number | null;
  currency: string | null;
  customerEmail: string | null;
}

export interface PaymentVerifyRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface OrderItem {
  orderItemId: number;
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  mrp: number | null;
  lineTotal: number;
}

export interface Order {
  orderId: number;
  email: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus | null;
  subtotal: number;
  discount: number | null;
  shipping: number;
  total: number;
  couponCode: string | null;
  addressId: number | null;
  createdAt: string;
  paidAt: string | null;
  orderItems: OrderItem[];
}

export interface Coupon {
  couponId?: number;
  code: string;
  type: DiscountType;
  /** PERCENT: 10 = 10%; FLAT: paise */
  value: number;
  minOrderPaise?: number | null;
  maxDiscountPaise?: number | null;
  usageLimit?: number | null;
  usedCount?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  active?: boolean | null;
}

/** Fields the admin form sends for create / update (discount is computed server-side). */
export type ProductInput = Pick<
  Product,
  "name" | "slug" | "description" | "category" | "gender" | "fragranceFamily" | "mrp" | "price" | "stock" | "active"
>;
