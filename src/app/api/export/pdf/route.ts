import PDFDocument from "pdfkit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function report(type: string, supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>) {
  if (type === "orders") { const { data, error } = await supabase.from("orders").select("number, customer_name_snapshot, status, total, created_at").order("created_at", { ascending: false }); if (error) throw error; return { title: "Pedidos", headers: ["Número", "Cliente", "Estado", "Total EUR", "Fecha"], rows: data.map((row) => [row.number, row.customer_name_snapshot, row.status, row.total, row.created_at]) }; }
  if (type === "quotes") { const { data, error } = await supabase.from("quotes").select("number, customer_name_snapshot, status, total, created_at").order("created_at", { ascending: false }); if (error) throw error; return { title: "Presupuestos", headers: ["Número", "Cliente", "Estado", "Total EUR", "Fecha"], rows: data.map((row) => [row.number, row.customer_name_snapshot, row.status, row.total, row.created_at]) }; }
  if (type === "customers") { const { data, error } = await supabase.from("customers").select("name, company, email, city").is("archived_at", null).order("name"); if (error) throw error; return { title: "Clientes", headers: ["Nombre", "Empresa", "Correo", "Población"], rows: data.map((row) => [row.name, row.company, row.email, row.city]) }; }
  if (type === "products") { const { data, error } = await supabase.from("products").select("code, name, base_price, stock_unit").is("archived_at", null).order("name"); if (error) throw error; return { title: "Productos", headers: ["Código", "Producto", "Precio EUR", "Unidad"], rows: data.map((row) => [row.code, row.name, row.base_price, row.stock_unit]) }; }
  return null;
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient(); if (!supabase) return Response.json({ error: "Servicio no configurado" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const type = new URL(request.url).searchParams.get("type") ?? "orders";
  try { const data = await report(type, supabase); if (!data) return Response.json({ error: "Tipo de exportación inválido" }, { status: 400 });
    const pdf = new PDFDocument({ size: "A4", margin: 42, layout: "landscape", info: { Title: data.title, Author: "NEVAL 5" } }); const chunks: Buffer[] = []; pdf.on("data", (chunk: Buffer) => chunks.push(chunk)); const done = new Promise<Buffer>((resolve, reject) => { pdf.on("end", () => resolve(Buffer.concat(chunks))); pdf.on("error", reject); });
    pdf.fillColor("#2A4227").font("Helvetica-Bold").fontSize(22).text("NEVAL 5"); pdf.fillColor("#171717").fontSize(15).text(data.title); pdf.fillColor("#667066").font("Helvetica").fontSize(8).text(`Generado el ${new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`); pdf.moveDown(2);
    const width = 756 / data.headers.length; const headerY = pdf.y; data.headers.forEach((header, index) => pdf.fillColor("#2A4227").font("Helvetica-Bold").fontSize(8).text(header, 42 + index * width, headerY, { width: width - 8 })); pdf.moveDown(1.5); pdf.moveTo(42, pdf.y).lineTo(800, pdf.y).strokeColor("#BDFF7B").stroke(); pdf.moveDown(.5);
    for (const row of data.rows) { if (pdf.y > 530) { pdf.addPage(); } const y = pdf.y; row.forEach((value, index) => pdf.fillColor("#171717").font("Helvetica").fontSize(7).text(String(value ?? ""), 42 + index * width, y, { width: width - 8, height: 18, ellipsis: true })); pdf.moveDown(1.7); }
    pdf.end(); const body = await done; return new Response(new Uint8Array(body), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${type}.pdf"`, "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "No se ha podido exportar" }, { status: 500 }); }
}
