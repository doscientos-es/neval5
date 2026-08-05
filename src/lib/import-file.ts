import readXlsxFile from "read-excel-file/node";
import { readImportCsv, readImportRows } from "@/lib/import-csv";

const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function isXlsx(file: File) {
  return file.name.toLocaleLowerCase("es-ES").endsWith(".xlsx") || file.type === xlsxMime;
}

export function isSupportedImportFile(file: File) {
  const name = file.name.toLocaleLowerCase("es-ES");
  return name.endsWith(".csv") || isXlsx(file) || file.type === "text/csv";
}

async function readRows(file: File) {
  if (isXlsx(file)) {
    const sheets = await readXlsxFile(Buffer.from(await file.arrayBuffer()));
    const rows = sheets[0]?.data;
    if (!rows?.length) throw new Error("El libro de Excel no contiene filas.");
    return rows;
  }
  return null;
}

export async function readImportHeaders(file: File) {
  const rows = await readRows(file);
  if (rows) return rows[0].map((value) => value == null ? "" : String(value).trim()).filter(Boolean);
  const first = (await file.text()).replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const separator = (first.match(/;/g)?.length ?? 0) >= (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  return first.split(separator).map((header) => header.trim().replace(/^"|"$/g, "")).filter(Boolean);
}

export async function readImportFile(file: File, required: string[], mapping?: Record<string, string>, optional?: string[]) {
  const rows = await readRows(file);
  return rows ? readImportRows(rows, required, mapping, optional) : readImportCsv(await file.text(), required, mapping, optional);
}
