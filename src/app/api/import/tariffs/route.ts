import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseImportMapping } from "@/lib/import-csv";
import { isSupportedImportFile, readImportFile } from "@/lib/import-file";

const required = ["tarifa", "codigo_producto", "precio_unitario"];
type Row = { line: number; tarifa: string; codigo_producto: string; precio_unitario: string };
type ParsedTariffs = { error: string } | { records: Row[]; errors: string[] };

async function parse(file: File, mapping?: Record<string, string>): Promise<ParsedTariffs> {
  const parsed = await readImportFile(file, required, mapping);
  if (parsed.error) return { error: parsed.error };
  const records = parsed.records as unknown as Row[];
  const seen = new Set<string>();
  const errors = records.flatMap((row) => { const key = `${row.tarifa.toLowerCase()}|${row.codigo_producto.toLowerCase()}`; const duplicate = seen.has(key); seen.add(key); const price = Number(row.precio_unitario.replace(",", ".")); return [!row.tarifa ? `Fila ${row.line}: la tarifa es obligatoria.` : null, !row.codigo_producto ? `Fila ${row.line}: el código de producto es obligatorio.` : null, !Number.isFinite(price) || price < 0 ? `Fila ${row.line}: el precio no es válido.` : null, duplicate ? `Fila ${row.line}: producto repetido en la tarifa.` : null].filter(Boolean) as string[]; });
  return { records, errors } as const;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient(); if (!supabase) return Response.json({ error: "Servicio no configurado" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const form = await request.formData(); const file = form.get("file"); const confirm = form.get("confirm") === "true"; const mapping = parseImportMapping(form.get("mapping"));
  if (!(file instanceof File) || !file.size || file.size > 20 * 1024 * 1024 || !isSupportedImportFile(file)) return Response.json({ error: "Selecciona un CSV o Excel (.xlsx) de hasta 20 MB." }, { status: 400 });
  let parsed: ParsedTariffs;
  try { parsed = await parse(file, mapping); } catch { return Response.json({ error: "No se ha podido leer el archivo de Excel." }, { status: 400 }); }
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 }); if (parsed.errors.length) return Response.json({ valid: false, errors: parsed.errors, preview: parsed.records.slice(0, 10) }, { status: 422 }); if (!confirm) return Response.json({ valid: true, total: parsed.records.length, preview: parsed.records.slice(0, 10) });
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle(); if (!membership) return Response.json({ error: "No perteneces a una empresa." }, { status: 403 });
  const { data: products, error: productError } = await supabase.from("products").select("code").eq("organization_id", membership.organization_id).is("archived_at", null); if (productError) return Response.json({ error: "No se ha podido validar el catálogo." }, { status: 400 });
  const productCodes = new Set(products.map((product) => product.code.toLocaleLowerCase("es-ES"))); const missing = parsed.records.filter((row) => !productCodes.has(row.codigo_producto.toLocaleLowerCase("es-ES"))); if (missing.length) return Response.json({ valid: false, errors: missing.map((row) => `Fila ${row.line}: no existe el producto ${row.codigo_producto}.`) }, { status: 422 });
  const { data: imported, error } = await supabase.rpc("import_tariff_items", { p_organization_id: membership.organization_id, p_items: parsed.records.map((row) => ({ tariff: row.tarifa, product_code: row.codigo_producto, unit_price: Number(row.precio_unitario.replace(",", ".")) })) });
  if (error) return Response.json({ error: "No se han podido importar los precios. No se ha aplicado ningún cambio." }, { status: 400 });
  return Response.json({ imported: imported ?? parsed.records.length }, { status: 201 });
}
