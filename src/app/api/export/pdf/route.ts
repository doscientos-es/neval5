import PDFDocument from "pdfkit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Filters = { from: string | null; to: string | null; status: string | null; customerId: string | null; salesRepId: string | null };

async function report(type: string, supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>, filters: Filters) {
  if (type === "orders") { let query = supabase.from("orders").select("number, customer_name_snapshot, status, total, created_at, profiles!orders_sales_rep_id_fkey(full_name)").order("created_at", { ascending: false }); if (filters.from) query = query.gte("created_at", filters.from); if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999Z`); if (filters.status) query = query.eq("status", filters.status as Database["public"]["Enums"]["order_status"]); if (filters.customerId) query = query.eq("customer_id", filters.customerId); if (filters.salesRepId) query = query.eq("sales_rep_id", filters.salesRepId); const { data, error } = await query; if (error) throw error; return { title: "Pedidos", headers: ["Número", "Cliente", "Comercial", "Estado", "Total EUR", "Fecha"], rows: data.map((row) => { const profile = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as { full_name: string } | null; return [row.number, row.customer_name_snapshot, profile?.full_name ?? "", row.status, row.total, row.created_at]; }) }; }
  if (type === "quotes") { let query = supabase.from("quotes").select("number, customer_name_snapshot, status, total, created_at").order("created_at", { ascending: false }); if (filters.from) query = query.gte("created_at", filters.from); if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999Z`); if (filters.status) query = query.eq("status", filters.status as Database["public"]["Enums"]["quote_status"]); if (filters.customerId) query = query.eq("customer_id", filters.customerId); const { data, error } = await query; if (error) throw error; return { title: "Presupuestos", headers: ["Número", "Cliente", "Estado", "Total EUR", "Fecha"], rows: data.map((row) => [row.number, row.customer_name_snapshot, row.status, row.total, row.created_at]) }; }
  if (type === "customers") { const { data, error } = await supabase.from("customers").select("name, company, email, city").is("archived_at", null).order("name"); if (error) throw error; return { title: "Clientes", headers: ["Nombre", "Empresa", "Correo", "Población"], rows: data.map((row) => [row.name, row.company, row.email, row.city]) }; }
  if (type === "products") { const { data, error } = await supabase.from("products").select("code, name, base_price, stock_unit").is("archived_at", null).order("name"); if (error) throw error; return { title: "Productos", headers: ["Código", "Producto", "Precio EUR", "Unidad"], rows: data.map((row) => [row.code, row.name, row.base_price, row.stock_unit]) }; }
  return null;
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient(); if (!supabase) return Response.json({ error: "Servicio no configurado" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const searchParams = new URL(request.url).searchParams; const type = searchParams.get("type") ?? "orders";
  try { const data = await report(type, supabase, { from: searchParams.get("from"), to: searchParams.get("to"), status: searchParams.get("status"), customerId: searchParams.get("customerId"), salesRepId: searchParams.get("salesRepId") }); if (!data) return Response.json({ error: "Tipo de exportación inválido" }, { status: 400 });
    const pdf = new PDFDocument({ size: "A4", margin: 42, layout: "landscape", info: { Title: data.title, Author: "NEVAL 5" } }); const chunks: Buffer[] = []; pdf.on("data", (chunk: Buffer) => chunks.push(chunk)); const done = new Promise<Buffer>((resolve, reject) => { pdf.on("end", () => resolve(Buffer.concat(chunks))); pdf.on("error", reject); });
    pdf.fillColor("#2A4227").font("Helvetica-Bold").fontSize(22).text("NEVAL 5"); pdf.fillColor("#171717").fontSize(15).text(data.title); pdf.fillColor("#667066").font("Helvetica").fontSize(8).text(`Generado el ${new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`); pdf.moveDown(2);
    const width = 756 / data.headers.length; const headerY = pdf.y; data.headers.forEach((header, index) => pdf.fillColor("#2A4227").font("Helvetica-Bold").fontSize(8).text(header, 42 + index * width, headerY, { width: width - 8 })); pdf.moveDown(1.5); pdf.moveTo(42, pdf.y).lineTo(800, pdf.y).strokeColor("#BDFF7B").stroke(); pdf.moveDown(.5);
    for (const row of data.rows) { if (pdf.y > 530) { pdf.addPage(); } const y = pdf.y; row.forEach((value, index) => pdf.fillColor("#171717").font("Helvetica").fontSize(7).text(String(value ?? ""), 42 + index * width, y, { width: width - 8, height: 18, ellipsis: true })); pdf.moveDown(1.7); }
    pdf.end(); const body = await done; return new Response(new Uint8Array(body), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${type}.pdf"`, "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "No se ha podido exportar" }, { status: 500 }); }
}
