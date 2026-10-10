import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { CartDTO, ProductDTO } from "@/lib/api/types";

/** A stand-in for the cart endpoints: one cart on "the server", changed by each call. */
const server = {
  lines: new Map<number, number>(),
  stock: new Map<number, number>(),
  calls: [] as string[],
  failNext: null as ApiError | null,
  delay: 0,
};
const dto = (): CartDTO => ({
  cartId: 7,
  totalPrice: 0,
  products: [...server.lines].map(([id, quantity]): ProductDTO => ({
    productId: id, name: `P${id}`, slug: `p${id}`, description: null, category: "ATTAR", gender: null, fragranceFamily: null,
    quantity, mrp: 100000, price: 100000, discount: 0, stock: server.stock.get(id) ?? 10, image: null, active: true,
  })),
  bundles: [],
});
const call = async <T,>(name: string, fn: () => T): Promise<T> => {
  server.calls.push(name);
  if (server.delay) await new Promise((r) => setTimeout(r, server.delay));
  if (server.failNext) {
    const e = server.failNext;
    server.failNext = null;
    throw e;
  }
  return fn();
};

vi.mock("@/lib/api/cart", () => ({
  cartApi: {
    get: vi.fn(() => call("get", dto)),
    add: vi.fn((id: number, q: number) =>
      call(`add ${id} ${q}`, () => {
        const next = (server.lines.get(id) ?? 0) + q;
        if (next > (server.stock.get(id) ?? 10)) throw new ApiError(`Only ${server.stock.get(id)} left of P${id}`, 400);
        server.lines.set(id, next);
        return dto();
      }),
    ),
    step: vi.fn((id: number, op: "add" | "delete") =>
      call(`${op} ${id}`, () => {
        const next = (server.lines.get(id) ?? 0) + (op === "add" ? 1 : -1);
        if (next <= 0) server.lines.delete(id);
        else server.lines.set(id, next);
        return dto();
      }),
    ),
    remove: vi.fn((cartId: number, id: number) =>
      call(`remove ${cartId} ${id}`, () => {
        server.lines.delete(id);
        return `P${id} removed from cart`;
      }),
    ),
    addBundle: vi.fn(() => call("addBundle", dto)),
    setBundleQuantity: vi.fn(() => call("setBundle", dto)),
    removeBundle: vi.fn(() => call("removeBundle", dto)),
  },
}));

const toasts: { title: string; tone?: string }[] = [];
vi.mock("@/store/toast", () => ({ toast: (t: { title: string; tone?: string }) => toasts.push(t) }));

const { useAuth } = await import("@/store/auth");
const { useCart } = await import("@/store/cart");

const signIn = () => useAuth.setState({ token: "t", user: { id: 1, username: "u", email: "u@example.com", roles: ["ROLE_USER"] }, expiresAt: Date.now() + 60_000 });
const lines = () => useCart.getState().cart?.lines.map((l) => `${l.key}x${l.quantity}`);

beforeEach(() => {
  server.lines = new Map();
  server.stock = new Map();
  server.calls = [];
  server.failNext = null;
  server.delay = 0;
  toasts.length = 0;
  useAuth.setState({ token: null, user: null, expiresAt: null });
  useCart.getState().reset();
});

describe("server cart store (ForgeX useCart)", () => {
  it("has no cart and makes no requests when signed out", async () => {
    expect(await useCart.getState().load()).toBeNull();
    expect(await useCart.getState().add(1)).toBe(false);
    expect(useCart.getState().status).toBe("signed-out");
    expect(server.calls).toEqual([]);
  });

  it("shows the cart the server sends back after each change", async () => {
    signIn();
    await useCart.getState().load();
    expect(await useCart.getState().add(1, 2)).toBe(true);
    expect(await useCart.getState().increment(1)).toBe(true);
    expect(lines()).toEqual(["P:1x3"]);
    expect(await useCart.getState().decrement(1)).toBe(true);
    expect(lines()).toEqual(["P:1x2"]);
    // DELETE answers with a message, so the cart is fetched again.
    expect(await useCart.getState().remove(1)).toBe(true);
    expect(lines()).toEqual([]);
    expect(server.calls).toEqual(["get", "add 1 2", "add 1", "delete 1", "remove 7 1", "get"]);
  });

  it("on a refusal shows the server's reason, refetches, and reports failure", async () => {
    signIn();
    server.stock.set(2, 1);
    await useCart.getState().load();
    expect(await useCart.getState().add(2, 3)).toBe(false);
    expect(toasts.at(-1)).toMatchObject({ title: "Couldn't add to your bag", tone: "error" });
    expect(server.calls.at(-1)).toBe("get");
    expect(lines()).toEqual([]);
  });

  it("runs changes in the order they were made", async () => {
    signIn();
    server.delay = 5;
    await useCart.getState().load();
    const s = useCart.getState();
    await Promise.all([s.add(1), s.increment(1), s.increment(1), s.decrement(1)]);
    expect(server.calls.slice(1)).toEqual(["add 1 1", "add 1", "add 1", "delete 1"]);
    expect(lines()).toEqual(["P:1x2"]);
  });

  it("sets an exact quantity: adds the difference, or lowers one step at a time", async () => {
    signIn();
    await useCart.getState().load();
    await useCart.getState().setQuantity(1, 4);
    expect(lines()).toEqual(["P:1x4"]);
    server.calls = [];
    await useCart.getState().setQuantity(1, 2);
    expect(server.calls).toEqual(["delete 1", "delete 1"]);
    expect(lines()).toEqual(["P:1x2"]);
    await useCart.getState().setQuantity(1, 0);
    expect(lines()).toEqual([]);
  });

  it("forgets the cart on sign-out and ignores answers for the previous account", async () => {
    signIn();
    await useCart.getState().load();
    server.delay = 20;
    const p = useCart.getState().add(1);
    useAuth.setState({ token: null, user: null });
    useCart.getState().reset();
    expect(await p).toBe(false);
    expect(useCart.getState().cart).toBeNull();
    expect(useCart.getState().status).toBe("signed-out");
  });

  it("an expired session empties the cart instead of showing an error", async () => {
    signIn();
    server.failNext = new ApiError("Your session has ended. Please sign in again.", 401);
    await useCart.getState().load();
    expect(useCart.getState()).toMatchObject({ cart: null, status: "signed-out", error: null });
  });

  it("keeps the cart shown when a refresh fails, and says why", async () => {
    signIn();
    await useCart.getState().add(1);
    server.failNext = new ApiError("Something went wrong on our side.", 500);
    await useCart.getState().load();
    expect(lines()).toEqual(["P:1x1"]);
    expect(useCart.getState().error).toEqual({ message: "Something went wrong on our side.", kind: "server" });
  });

  it("tracks which line has a change in flight", async () => {
    signIn();
    server.delay = 10;
    await useCart.getState().load();
    const p = useCart.getState().add(5);
    expect(useCart.getState().pending).toEqual(["P:5"]);
    await p;
    expect(useCart.getState().pending).toEqual([]);
  });
});
