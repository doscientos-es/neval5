import { describe, expect, it } from "vitest";
import { readImportCsv, readImportRows } from "./import-csv";

describe("readImportCsv", () => {
  it("reads quoted cells and semicolons inside a cell", () => {
    const result = readImportCsv('Nombre;Email\n"Maderas; Norte";ventas@example.com', ["nombre", "email"]);
    if ("error" in result) throw new Error(result.error);
    expect(result.records[0]).toMatchObject({ nombre: "Maderas; Norte", email: "ventas@example.com", line: 2 });
  });

  it("maps user-provided source column names", () => {
    const result = readImportCsv("Cliente,Correo\nNEVAL,contacto@neval.es", ["nombre", "email"], { nombre: "Cliente", email: "Correo" });
    if ("error" in result) throw new Error(result.error);
    expect(result.records[0]).toMatchObject({ nombre: "NEVAL", email: "contacto@neval.es" });
  });

  it("uses the same mapping for rows extracted from Excel", () => {
    const result = readImportRows([["Cliente", "Precio"], ["NEVAL", 12.5]], ["nombre", "precio_base"], { nombre: "Cliente", precio_base: "Precio" });
    if ("error" in result) throw new Error(result.error);
    expect(result.records[0]).toMatchObject({ nombre: "NEVAL", precio_base: "12.5", line: 2 });
  });

  it("reads an optional exported identifier without requiring it", () => {
    const result = readImportCsv("Identificador;Nombre\n4c17c5a7-431c-4575-a11e-6ba0c23ae443;NEVAL", ["nombre"], undefined, ["identificador"]);
    if ("error" in result) throw new Error(result.error);
    expect(result.records[0]).toMatchObject({ identificador: "4c17c5a7-431c-4575-a11e-6ba0c23ae443", nombre: "NEVAL" });
  });
});
