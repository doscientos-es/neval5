import { describe, expect, it } from "vitest";
import { calculateDocument, calculateLine } from "./pricing";

describe("cálculo comercial", () => {
  it("calcula el descuento de línea y el IVA con redondeo a céntimos", () => {
    expect(calculateLine({ quantity: 3, unitPrice: 19.995, discountPct: 10, taxRate: 21 })).toEqual({
      net: 53.99,
      tax: 11.34,
      total: 65.33,
    });
  });

  it("conserva el IVA cero sin introducir errores de redondeo", () => {
    expect(calculateLine({ quantity: 2.5, unitPrice: 12.4, discountPct: 0, taxRate: 0 })).toEqual({
      net: 31,
      tax: 0,
      total: 31,
    });
  });

  it("aplica el descuento global de forma homogénea a base e IVA", () => {
    expect(calculateDocument([
      { quantity: 2, unitPrice: 100, discountPct: 10, taxRate: 21 },
      { quantity: 1, unitPrice: 50, discountPct: 0, taxRate: 10 },
    ], 5)).toEqual({ net: 218.5, tax: 40.66, total: 259.16 });
  });

  it("acumula líneas con distintos tipos de IVA", () => {
    expect(calculateDocument([
      { quantity: 1, unitPrice: 100, discountPct: 0, taxRate: 21 },
      { quantity: 1, unitPrice: 100, discountPct: 0, taxRate: 10 },
    ])).toEqual({ net: 200, tax: 31, total: 231 });
  });
});
