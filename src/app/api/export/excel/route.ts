import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function escapeXml(value: unknown) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

async function report(type: string, supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>) {
  if (type === "orders") { const { data, error } = await supabase.from("orders").select("number, customer_name_snapshot, status, total, created_at").order("created_at", { ascending: false }); if (error) throw error; return { title: "Pedidos", headers: ["Número", "Cliente", "Estado", "Total EUR", "Fecha"], rows: data.map((row) => [row.number, row.customer_name_snapshot, row.status, row.total, row.created_at]) }; }
  if (type === "quotes") { const { data, error } = await supabase.from("quotes").select("number, customer_name_snapshot, status, subtotal, tax_total, total, created_at").order("created_at", { ascending: false }); if (error) throw error; return { title: "Presupuestos", headers: ["Número", "Cliente", "Estado", "Base EUR", "IVA EUR", "Total EUR", "Fecha"], rows: data.map((row) => [row.number, row.customer_name_snapshot, row.status, row.subtotal, row.tax_total, row.total, row.created_at]) }; }
  if (type === "customers") { const { data, error } = await supabase.from("customers").select("name, company, email, phone, mobile, address, city, province").is("archived_at", null).order("name"); if (error) throw error; return { title: "Clientes", headers: ["Nombre", "Empresa", "Email", "Teléfono", "Móvil", "Dirección", "Población", "Provincia"], rows: data.map((row) => [row.name, row.company, row.email, row.phone, row.mobile, row.address, row.city, row.province]) }; }
  if (type === "products") { const { data, error } = await supabase.from("products").select("code, name, description, base_price, track_stock, stock_unit, minimum_stock").is("archived_at", null).order("name"); if (error) throw error; return { title: "Productos", headers: ["Código", "Nombre", "Descripción", "Precio base EUR", "Inventariable", "Unidad", "Stock mínimo"], rows: data.map((row) => [row.code, row.name, row.description, row.base_price, row.track_stock ? "Sí" : "No", row.stock_unit, row.minimum_stock]) }; }
  return null;
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient(); if (!supabase) return Response.json({ error: "Servicio no configurado" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const type = new URL(request.url).searchParams.get("type") ?? "orders";
  try { const data = await report(type, supabase); if (!data) return Response.json({ error: "Tipo de exportación inválido" }, { status: 400 });
    const rows = [data.headers, ...data.rows].map((row, index) => `<Row>${row.map((cell) => `<Cell ss:StyleID="${index === 0 ? "header" : "cell"}"><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join("")}</Row>`).join("");
    const document = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#2A4227" ss:Pattern="Solid"/></Style><Style ss:ID="cell"><Alignment ss:Vertical="Center"/></Style></Styles><Worksheet ss:Name="${escapeXml(data.title)}"><Table>${rows}</Table></Worksheet></Workbook>`;
    return new Response(document, { headers: { "Content-Type": "application/vnd.ms-excel; charset=utf-8", "Content-Disposition": `attachment; filename="${type}.xls"`, "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "No se ha podido exportar" }, { status: 500 }); }
}
