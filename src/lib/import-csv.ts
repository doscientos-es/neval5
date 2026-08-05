export type ImportRecord = { line: number; [key: string]: string | number };
type ImportRows = Array<Array<unknown>>;

export function normalizeImportHeader(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es-ES")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

function parseWithDelimiter(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(cell.trim()); cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else cell += character;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function cellToText(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value == null ? "" : String(value).trim();
}

export function readImportRows(sourceRows: ImportRows, required: string[], mapping?: Record<string, string>) {
  const rows = sourceRows.map((row) => row.map(cellToText));
  const header = rows.shift() ?? [];
  const normalized = header.map(normalizeImportHeader);
  const sourceForField = (field: string) => normalizeImportHeader(mapping?.[field] || field);
  if (new Set(required.map(sourceForField)).size !== required.length) return { error: "Cada campo debe asignarse a una columna diferente.", headers: header } as const;
  const unresolved = required.filter((field) => !normalized.includes(sourceForField(field)));
  if (unresolved.length) return { error: `Faltan columnas requeridas: ${unresolved.join(", ")}.`, headers: header } as const;

  const records = rows.filter((row) => row.some(Boolean)).map((row, rowIndex) => {
    const result: ImportRecord = { line: rowIndex + 2 };
    required.forEach((field) => {
      const columnIndex = normalized.indexOf(sourceForField(field));
      result[field] = row[columnIndex] ?? "";
    });
    return result;
  });
  return { records, headers: header } as const;
}

export function readImportCsv(text: string, required: string[], mapping?: Record<string, string>) {
  const source = text.replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  return readImportRows(parseWithDelimiter(source, delimiter), required, mapping);
}

export function parseImportMapping(value: FormDataEntryValue | null): Record<string, string> {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}
