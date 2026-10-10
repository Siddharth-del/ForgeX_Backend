/**
 * Types mirroring the ForgeX Spring Boot DTOs (forgex_website/Forgex/src/main/java/com/example/ForgeX/dto).
 * Money is always in PAISE (₹1 = 100) exactly as the backend sends it; convert only for display.
 * Dates are Jackson LocalDateTime strings without a zone, e.g. "2026-10-09T23:45:12.123".
 */

export type CategoryEnum = "ATTAR" | "PERFUME";
export type GenderEnum = "MEN" | "WOMEN" | "UNISEX";
export type FragranceFamilyEnum = "AMBER" | "AQUATIC" | "AROMATIC" | "EARTHY" | "FLORAL" | "MIXED" | "WOODY";
export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
/** UPI exists in the enum, but checkout treats anything other than COD as a Razorpay payment. */
export type PaymentMethod = "RAZORPAY" | "COD" | "UPI";
export type PaymentStatus = "CREATED" | "CAPTURED" | "FAILED" | "REFUNDED" | "PENDING_COD";
export type DiscountType = "PERCENT" | "FLAT";

export const CATEGORIES: CategoryEnum[] = ["PERFUME", "ATTAR"];
export const GENDERS: GenderEnum[] = ["MEN", "WOMEN", "UNISEX"];
export const FRAGRANCE_FAMILIES: FragranceFamilyEnum[] = ["AMBER", "AQUATIC", "AROMATIC", "EARTHY", "FLORAL", "MIXED", "WOODY"];
export const ORDER_STATUSES: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

/** dto/ProductDTO.java */
export interface ProductDTO {
  productId: number;
  name: string;
  slug: string;
  description: string | null;
  category: CategoryEnum | null;
  gender: GenderEnum | null;
  fragranceFamily: FragranceFamilyEnum | null;
  /** Only filled in cart responses. */
  quantity: number | null;
  /** Original price, paise. */
  mrp: number | null;
  /** Selling price, paise. */
  price: number | null;
  /** % off MRP, calculated by the server. */
  discount: number | null;
  stock: number | null;
  /** Cloudinary secure_url set by PUT /api/admin/products/{id}/image. */
  image: string | null;
  active: boolean | null;
}

/** dto/ProductResponse.java */
export interface ProductResponse {
  content: ProductDTO[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  lastPage: boolean;
}

/** Body for POST /api/admin/products and PUT /api/admin/products/{id}. */
export type ProductInput = Omit<ProductDTO, "productId" | "quantity" | "discount" | "image"> & { image?: string | null };

/** dto/CartDTO.java — products carry `quantity`; totalPrice is paise. */
export interface CartDTO {
  cartId: number;
  totalPrice: number;
  products: ProductDTO[];
}

/** dto/AddressDTO.java (validation lives on model/Address.java). */
export interface AddressDTO {
  addressId: number;
  street: string;
  buildingName: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phoneNumber: string;
}
export type AddressInput = Omit<AddressDTO, "addressId">;

/** dto/PriceBreakdown.java — all paise. */
export interface PriceBreakdown {
  subtotal: number;
  mrpTotal: number;
  productSavings: number;
  couponDiscount: number;
  couponCode: string | null;
  /** Why a coupon was rejected, or "Applied". */
  couponMessage: string | null;
  shipping: number;
  total: number;
}

/** dto/CheckoutRequest.java */
export interface CheckoutRequest {
  addressId: number;
  paymentMethod: "RAZORPAY" | "COD";
  couponCode?: string;
}

/** dto/CheckoutResponse.java — Razorpay fields are only set for online payments. */
export interface CheckoutResponse {
  orderId: number;
  status: OrderStatus;
  price: PriceBreakdown | null;
  razorpayKeyId: string | null;
  razorpayOrderId: string | null;
  /** Paise. */
  amount: number | null;
  currency: string | null;
  customerEmail: string | null;
}

/** dto/PaymentVerifyRequest.java (snake_case via @JsonProperty). */
export interface PaymentVerifyRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** dto/OrderItemDTO.java */
export interface OrderItemDTO {
  orderItemId: number;
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  mrp: number | null;
  lineTotal: number;
}

/** dto/OrderDTO.java */
export interface OrderDTO {
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
  orderItems: OrderItemDTO[];
}

/** dto/CouponDTO.java */
export interface CouponDTO {
  couponId: number;
  code: string;
  type: DiscountType;
  /** PERCENT: 10 = 10%. FLAT: paise. */
  value: number;
  minOrderPaise: number | null;
  maxDiscountPaise: number | null;
  usageLimit: number | null;
  usedCount: number | null;
  validFrom: string | null;
  validTo: string | null;
  active: boolean | null;
}
export type CouponInput = Omit<CouponDTO, "couponId" | "usedCount">;

/** Order status changes the backend accepts (service/OrderServiceImpl.java ALLOWED). */
export const ORDER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PAID: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
};

/** Invoices exist for every order that isn't awaiting payment or cancelled (service/InvoiceService.java). */
export const invoiceAvailable = (status: OrderStatus) => status !== "PENDING_PAYMENT" && status !== "CANCELLED";

export const paise = (rupees: number) => Math.round(rupees * 100);
export const rupees = (p: number | null | undefined) => (p ?? 0) / 100;
