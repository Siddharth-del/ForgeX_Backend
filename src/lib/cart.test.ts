import { describe, expect, it } from "vitest";
import type { CartBundleDTO, CartDTO, ProductDTO } from "@/lib/api/types";
import { cartProblems, cartSignature, lineProblem, mapCart, type CartBoxLine, type CartProductLine } from "@/lib/cart";

const product = (id: number, quantity: number, over: Partial<ProductDTO> = {}): ProductDTO => ({
  productId: id, name: `P${id}`, slug: `p${id}`, description: null, category: id % 2 ? "ATTAR" : "PERFUME", gender: null, fragranceFamily: null,
  quantity, mrp: 250000, price: 199900, discount: 20, stock: 10, image: null, active: true, ...over,
});
const box = (ids: number[], quantity: number, over: Partial<CartBundleDTO> = {}): CartBundleDTO => ({
  cartItemId: 50 + ids[0], bundleId: 1, slug: "build-your-box", name: "Build Your Own Box", lineKey: `B:1:${[...ids].sort((a, b) => a - b).join(",")}`,
  productIds: ids, components: ids.map((id) => ({ productId: id, name: `P${id}`, slug: `p${id}`, image: null, category: "ATTAR", price: 129900, active: true, stock: 10, quantity: 1 })),
  quantity, unitPrice: 179900, value: 389700, lineTotal: 179900 * quantity, available: true, problem: null, ruleProblem: null, stockProblem: null, ...over,
});
const dto = (products: ProductDTO[], bundles: CartBundleDTO[] = []): CartDTO => ({ cartId: 7, totalPrice: 0, products, bundles });

describe("mapCart (ported from the ForgeX frontend)", () => {
  it("maps products and boxes with the server's prices, in paise", () => {
    const cart = mapCart(dto([product(1, 2)], [box([1, 2, 3], 1)]));
    expect(cart.id).toBe(7);
    expect(cart.lines.map((l) => l.key)).toEqual(["P:1", "B:1:1,2,3"]);
    expect(cart.count).toBe(3);
    expect(cart.subtotal).toBe(2 * 199900 + 179900);
    expect(cart.savings).toBe(2 * (250000 - 199900) + (389700 - 179900));
    const boxLine = cart.lines[1] as CartBoxLine;
    expect(boxLine.contents.map((c) => c.name)).toEqual(["P1", "P2", "P3"]);
  });

  it("groups repeated product entries and treats a missing quantity as 1, like ForgeX", () => {
    const cart = mapCart(dto([product(1, 2), product(1, 3), product(2, null as unknown as number)]));
    expect(cart.lines.map((l) => `${l.key}x${l.quantity}`)).toEqual(["P:1x5", "P:2x1"]);
    expect((cart.lines[0] as CartProductLine).lineTotal).toBe(5 * 199900);
  });

  it("gives an empty cart for no data, and handles backends without box support", () => {
    expect(mapCart(null)).toEqual({ id: null, lines: [], count: 0, subtotal: 0, savings: 0 });
    expect(mapCart({ cartId: 3, totalPrice: 0, products: [] }).lines).toEqual([]);
  });
});

describe("what blocks an order", () => {
  it("flags inactive, sold-out and short lines with what can still be ordered", () => {
    const cart = mapCart(dto([product(1, 1, { active: false }), product(2, 1, { stock: 0 }), product(3, 4, { stock: 2 }), product(4, 1)]));
    expect(cart.lines.map((l) => lineProblem(l))).toEqual([
      { message: "P1 is no longer available.", canOrder: 0 },
      { message: "P2 is out of stock.", canOrder: 0 },
      { message: "Only 2 left of P3.", canOrder: 2 },
      null,
    ]);
  });

  it("tells a box whose rules changed (rebuild it) from one that is short on stock (fewer boxes)", () => {
    const rules = mapCart(dto([], [box([1, 2, 3], 1, { available: false, problem: "Now needs 4.", ruleProblem: "Now needs 4." })]));
    expect(lineProblem(rules.lines[0])).toEqual({ message: "Now needs 4.", canOrder: 0 });

    const short = box([1, 2, 3], 3, { available: false, problem: "Only 2 left of P2", stockProblem: "Only 2 left of P2" });
    short.components[1].stock = 2;
    expect(lineProblem(mapCart(dto([], [short])).lines[0])).toEqual({ message: "Only 2 left of P2", canOrder: 2 });
  });

  it("counts a fragrance that is both on its own and inside a box", () => {
    const b = box([1, 2, 3], 2);
    b.components[1].stock = 3;
    const cart = mapCart(dto([product(2, 2, { stock: 3 })], [b]));
    const problems = cartProblems(cart);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ key: "B:1:1,2,3", canOrder: 1 });
    expect(problems[0].message).toMatch(/Only 3 of P2 left, and your bag needs 4/);
  });

  it("finds nothing wrong with an orderable cart", () => {
    expect(cartProblems(mapCart(dto([product(1, 2)], [box([1, 2, 3], 1)])))).toEqual([]);
  });
});

describe("cartSignature", () => {
  it("depends on contents, not order", () => {
    const a = mapCart(dto([product(1, 2), product(2, 1)], [box([1, 2, 3], 1)]));
    const b = mapCart(dto([product(2, 1), product(1, 2)], [box([3, 2, 1], 1)]));
    expect(cartSignature(a)).toBe(cartSignature(b));
    expect(cartSignature(a)).not.toBe(cartSignature(mapCart(dto([product(1, 3), product(2, 1)], [box([1, 2, 3], 1)]))));
  });
});
