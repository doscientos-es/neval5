import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseImportMapping, readImportCsv } from "@/lib/import-csv";

const columns = ["codigo", "nombre", "descripcion", "precio_base", "inventariable", "unidad", "stock_minimo"];
type Row = { line: number; codigo: string; nombre: string; descripcion: string; precio_base: string; inventariable: string; unidad: string; stock_minimo: string };
type ParsedProducts = { error: string } | { records: Row[]; errors: string[] };

function parse(text: string, mapping?: Record<string, string>): ParsedProducts {
  const parsed = readImportCsv(text, columns, mapping);
  if (parsed.error) return { error: parsed.error };
  const records = parsed.records as unknown as Row[];
  const seen = new Set<string>();
  const errors = records.flatMap((row) => {
    const price = Number(row.precio_base.replace(",", ".")); const minimum = Number(row.stock_minimo.replace(",", ".")); const inventory = row.inventariable.toLowerCase();
    const duplicate = seen.has(row.codigo.toLowerCase()); seen.add(row.codigo.toLowerCase());
    return [!row.codigo ? `Fila ${row.line}: el código es obligatorio.` : null, !row.nombre || row.nombre.length < 2 ? `Fila ${row.line}: el nombre es obligatorio.` : null, !Number.isFinite(price) || price < 0 ? `Fila ${row.line}: el precio base no es válido.` : null, !Number.isFinite(minimum) || minimum < 0 ? `Fila ${row.line}: el stock mínimo no es válido.` : null, !["si", "sí", "no", "true", "false", "1", "0"].includes(inventory) ? `Fila ${row.line}: inventariable debe ser sí o no.` : null, duplicate ? `Fila ${row.line}: el código ${row.codigo} está repetido en el archivo.` : null].filter(Boolean) as string[];
  });
  return { records, errors } as const;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return Response.json({ error: "Servicio no configurado" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const form = await request.formData(); const file = form.get("file"); const confirm = form.get("confirm") === "true"; const mapping = parseImportMapping(form.get("mapping"));
  if (!(file instanceof File) || file.size === 0 || file.size > 20 * 1024 * 1024) return Response.json({ error: "Selecciona un CSV de hasta 20 MB." }, { status: 400 });
  const parsed = parse(await file.text(), mapping);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  if (parsed.errors.length) return Response.json({ valid: false, errors: parsed.errors, preview: parsed.records.slice(0, 10) }, { status: 422 });
  if (!confirm) return Response.json({ valid: true, total: parsed.records.length, preview: parsed.records.slice(0, 10) });
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) return Response.json({ error: "No perteneces a una empresa." }, { status: 403 });
  const products = parsed.records.map((row) => ({ organization_id: membership.organization_id, code: row.codigo, name: row.nombre, description: row.descripcion || null, base_price: Number(row.precio_base.replace(",", ".")), track_stock: ["si", "sí", "true", "1"].includes(row.inventariable.toLowerCase()), stock_unit: row.unidad || "ud", minimum_stock: Number(row.stock_minimo.replace(",", ".")) }));
  const { error } = await supabase.from("products").upsert(products, { onConflict: "organization_id,code" });
  if (error) return Response.json({ error: "No se ha podido importar el archivo. No se ha aplicado ningún cambio." }, { status: 400 });
  return Response.json({ imported: products.length }, { status: 201 });
}
