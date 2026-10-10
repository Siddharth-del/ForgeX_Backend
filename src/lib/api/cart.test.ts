import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cartApi } from "@/lib/api/cart";
import { errorKind } from "@/lib/api/client";
import { InvalidIdError } from "@/lib/ids";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ cartId: 1, totalPrice: 0, products: [], bundles: [] }), { status: 200, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { location: { origin: "http://shop.test" } });
});
afterEach(() => vi.unstubAllGlobals());

describe("cart API client never builds a request from a bad id", () => {
  it.each([
    ["add with NaN", () => cartApi.add(Number("box"), 1)],
    ["add with 0", () => cartApi.add(0, 1)],
    ["step with a fraction", () => cartApi.step(1.5, "add")],
    ["remove with a bad cart id", () => cartApi.remove(Number.NaN, 3)],
    ["addBundle with a bad box id", () => cartApi.addBundle(-1, [1, 2, 3])],
    ["addBundle with a bad product id inside", () => cartApi.addBundle(1, [1, Number.NaN, 3])],
    ["setBundleQuantity with a bad line id", () => cartApi.setBundleQuantity(Number.NaN, 2)],
    ["removeBundle with a bad line id", () => cartApi.removeBundle(0)],
  ])("%s", async (_label, call) => {
    await expect(call()).rejects.toBeInstanceOf(InvalidIdError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects quantities outside 1–10 (0–10 for boxes) before sending", async () => {
    await expect(cartApi.add(1, 0)).rejects.toBeInstanceOf(RangeError);
    await expect(cartApi.add(1, 11)).rejects.toBeInstanceOf(RangeError);
    await expect(cartApi.setBundleQuantity(4, -1)).rejects.toBeInstanceOf(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an invalid id is reported as an input problem, not a session problem", async () => {
    const err = await cartApi.add(Number.NaN, 1).catch((e) => e);
    expect(errorKind(err)).toBe("invalid");
  });

  it("sends valid requests to the documented endpoints, with credentials", async () => {
    await cartApi.add(3, 2);
    await cartApi.addBundle(1, [6, 1, 3], 1);
    await cartApi.setBundleQuantity(9, 0);
    const calls = fetchMock.mock.calls.map(([url, init]) => [new URL(String(url)).pathname, (init as RequestInit).method, (init as RequestInit).credentials]);
    expect(calls).toEqual([
      ["/api/carts/products/3/quantity/2", "POST", "include"],
      ["/api/carts/bundles/1", "POST", "include"],
      ["/api/carts/bundle-items/9/quantity/0", "PUT", "include"],
    ]);
    expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)).toEqual({ productIds: [6, 1, 3], quantity: 1 });
  });
});

describe("errorKind", () => {
  it.each([
    [401, "session"],
    [403, "forbidden"],
    [404, "not-found"],
    [409, "conflict"],
    [400, "invalid"],
    [413, "invalid"],
    [500, "server"],
    [503, "server"],
  ] as const)("HTTP %i → %s", async (status, kind) => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: "nope", status: false }), { status, headers: { "Content-Type": "application/json" } }));
    const err = await cartApi.get().catch((e) => e);
    expect(errorKind(err)).toBe(kind);
  });

  it("a failed connection is a network problem", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const err = await cartApi.get().catch((e) => e);
    expect(errorKind(err)).toBe("network");
  });
});
