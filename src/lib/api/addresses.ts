/** Addresses (controller/AddressController.java; rules from model/Address.java). */
import { api, ApiError } from "@/lib/api/client";
import { errorMessage } from "@/lib/errors";
import type { AddressDTO, AddressInput } from "@/lib/api/types";

export const addressApi = {
  mine: () => api<AddressDTO[]>("/api/users/addresses"),
  get: (id: number) => api<AddressDTO>(`/api/addresses/${id}`),
  create: (a: AddressInput) => api<AddressDTO>("/api/addresses", { method: "POST", body: a }),
  remove: (id: number) => api<string>(`/api/addresses/${id}`, { method: "DELETE" }),
};

/**
 * The backend validates addresses only on the database entity, and a failure there comes back
 * as a generic error, so mirror its exact rules here first.
 */
export function validateAddress(a: AddressInput): Partial<Record<keyof AddressInput, string>> {
  const e: Partial<Record<keyof AddressInput, string>> = {};
  const min = (k: keyof AddressInput, n: number, label: string) => {
    if (a[k].trim().length < n) e[k] = `${label} must be at least ${n} characters.`;
  };
  min("buildingName", 5, "House / building");
  min("street", 5, "Street / area");
  min("city", 4, "City");
  min("state", 2, "State");
  min("country", 2, "Country");
  min("pincode", 5, "Pincode");
  const phone = a.phoneNumber.trim();
  if (phone.length < 10 || phone.length > 15) e.phoneNumber = "Phone number must be 10 to 15 characters.";
  else if (!/^\+?[\d\s-]+$/.test(phone)) e.phoneNumber = "Use digits only (a leading + is fine).";
  if (a.pincode.trim() && !/^[A-Za-z\d\s-]+$/.test(a.pincode.trim())) e.pincode = "Use letters and digits only.";
  return e;
}

/** Explains a failed delete: the backend answers with a generic error when an order still uses the address. */
export const removeAddressError = (e: unknown) =>
  e instanceof ApiError && e.status >= 500 ? "This address is linked to an order, so it's kept for that delivery and can't be removed." : errorMessage(e);
