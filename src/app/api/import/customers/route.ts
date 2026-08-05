import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseImportMapping, readImportCsv } from "@/lib/import-csv";

const columns = ["nombre", "empresa", "email", "telefono", "movil", "direccion", "poblacion", "provincia"];
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type ImportRow = { line: number; [key: string]: string | number };
type ParsedCustomers = { error: string } | { records: ImportRow[]; errors: string[] };

function parse(text: string, mapping?: Record<string, string>): ParsedCustomers {
  const parsed = readImportCsv(text, columns, mapping);
  if (parsed.error) return { error: parsed.error };
  const records = parsed.records as ImportRow[];
  const errors = records.flatMap((row) => { const name = String(row.nombre ?? ""); const address = String(row.email ?? ""); return [!name || name.length < 2 ? `Fila ${row.line}: el nombre es obligatorio.` : null, address && !email.test(address) ? `Fila ${row.line}: el email no es válido.` : null].filter(Boolean) as string[]; });
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
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) return Response.json({ error: "No perteneces a una empresa." }, { status: 403 });
  const { data: existing, error: existingError } = await supabase.from("customers").select("name, company, email").eq("organization_id", membership.organization_id);
  if (existingError) return Response.json({ error: "No se ha podido comprobar duplicados." }, { status: 500 });
  const existingNames = new Set(existing.map((customer) => `${customer.name}|${customer.company ?? ""}`.toLocaleLowerCase("es-ES")));
  const existingEmails = new Set(existing.flatMap((customer) => customer.email ? [customer.email.toLocaleLowerCase("es-ES")] : []));
  const duplicates = parsed.records.filter((row) => existingNames.has(`${String(row.nombre)}|${String(row.empresa ?? "")}`.toLocaleLowerCase("es-ES")) || (String(row.email ?? "") && existingEmails.has(String(row.email).toLocaleLowerCase("es-ES")))).map((row) => `Fila ${row.line}: posible duplicado (${String(row.nombre)}).`);
  if (!confirm) return Response.json({ valid: true, total: parsed.records.length, preview: parsed.records.slice(0, 10), duplicates });
  const { error } = await supabase.from("customers").insert(parsed.records.map((row) => ({ organization_id: membership.organization_id, name: String(row.nombre), company: String(row.empresa || "") || null, email: String(row.email || "") || null, phone: String(row.telefono || "") || null, mobile: String(row.movil || "") || null, address: String(row.direccion || "") || null, city: String(row.poblacion || "") || null, province: String(row.provincia || "") || null })));
  if (error) return Response.json({ error: "No se ha podido importar el archivo." }, { status: 400 });
  return Response.json({ imported: parsed.records.length }, { status: 201 });
}
