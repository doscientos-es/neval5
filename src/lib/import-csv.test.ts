import { describe, expect, it } from "vitest";
import { readImportCsv } from "./import-csv";

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
});
