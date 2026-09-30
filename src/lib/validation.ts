import { z } from "zod";

/*
 * Client-side rules mirror the backend's Jakarta Validation annotations
 * (SignupRequest, LoginRequest, Address, CouponDTO) so users see the same limits
 * before a request is sent. The backend remains the source of truth.
 */

const email = z.string().trim().min(1, "Enter your email").max(50, "Email is too long").email("Enter a valid email");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "At least 3 characters")
      .max(20, "20 characters at most")
      .regex(/^[a-zA-Z0-9._-]+$/, "Letters, numbers, dots, dashes and underscores only"),
    email,
    password: z.string().min(6, "At least 6 characters").max(40, "40 characters at most"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
export type SignUpValues = z.infer<typeof signUpSchema>;

export const emailOnlySchema = z.object({ email });
export const otpSchema = z.object({ otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") });
export const newPasswordSchema = z
  .object({
    password: z.string().min(6, "At least 6 characters").max(40, "40 characters at most"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

export const addressSchema = z.object({
  buildingName: z.string().trim().min(5, "House / flat and building, at least 5 characters"),
  street: z.string().trim().min(5, "Street and area, at least 5 characters"),
  city: z.string().trim().min(4, "City, at least 4 characters"),
  state: z.string().trim().min(2, "Choose a state"),
  country: z.string().trim().min(2, "Country"),
  pincode: z.string().trim().regex(/^\d{6}$/, "6-digit PIN code"),
  phoneNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\+?\d{10,14}$/, "10-digit mobile number")),
});
export type AddressValues = z.input<typeof addressSchema>;

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(100),
    slug: z
      .string()
      .trim()
      .min(2, "Slug is required")
      .max(120)
      .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes"),
    description: z.string().trim().max(2000, "2000 characters at most"),
    category: z.enum(["ATTAR", "PERFUME"]),
    gender: z.enum(["MEN", "WOMEN", "UNISEX"]),
    fragranceFamily: z.enum(["AMBER", "AQUATIC", "AROMATIC", "EARTHY", "FLORAL", "MIXED", "WOODY"]),
    mrpRupees: z.coerce.number<string | number>().positive("MRP must be above 0"),
    priceRupees: z.coerce.number<string | number>().positive("Price must be above 0"),
    stock: z.coerce.number<string | number>().int("Whole number").min(0, "Can't be negative"),
    active: z.boolean(),
  })
  .refine((v) => v.priceRupees <= v.mrpRupees, { path: ["priceRupees"], message: "Price can't be above MRP" });
export type ProductFormValues = z.input<typeof productSchema>;

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "At least 3 characters")
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, dashes"),
    type: z.enum(["PERCENT", "FLAT"]),
    value: z.coerce.number<string | number>().positive("Must be above 0"),
    minOrderRupees: z.coerce.number<string | number>().min(0).optional(),
    maxDiscountRupees: z.union([z.literal(""), z.coerce.number<string | number>().positive()]).optional(),
    usageLimit: z.union([z.literal(""), z.coerce.number<string | number>().int().positive()]).optional(),
    validFrom: z.string().optional(),
    validTo: z.string().optional(),
    active: z.boolean(),
  })
  .refine((v) => v.type !== "PERCENT" || (v.value >= 1 && v.value <= 90), {
    path: ["value"],
    message: "Percent coupons must be between 1 and 90",
  })
  .refine((v) => !v.validFrom || !v.validTo || v.validTo >= v.validFrom, {
    path: ["validTo"],
    message: "Must be after the start",
  });
export type CouponFormValues = z.input<typeof couponSchema>;
