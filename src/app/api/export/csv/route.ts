import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

function cell(value: unknown) {
  const text = String(value ?? "");
  return /[;"\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "orders";
  const from = searchParams.get("from"); const to = searchParams.get("to"); const status = searchParams.get("status");
  const customerId = searchParams.get("customerId"); const salesRepId = searchParams.get("salesRepId");
  if (!['orders', 'quotes', 'customers', 'products'].includes(type)) return NextResponse.json({ error: "Tipo de exportación inválido" }, { status: 400 });

  let headers: string[]; let rows: unknown[][]; let filename: string;
  if (type === "orders") {
    let query = supabase.from("orders").select("number, customer_name_snapshot, status, total, created_at, sales_rep_id, profiles!orders_sales_rep_id_fkey(full_name)").order("created_at", { ascending: false });
    if (from) query = query.gte("created_at", from); if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`); if (status) query = query.eq("status", status as Database["public"]["Enums"]["order_status"]); if (customerId) query = query.eq("customer_id", customerId); if (salesRepId) query = query.eq("sales_rep_id", salesRepId);
    const { data, error } = await query; if (error) return NextResponse.json({ error: "No se ha podido exportar" }, { status: 500 });
    headers = ["Número", "Cliente", "Comercial", "Estado", "Total EUR", "Fecha"]; rows = data.map((row) => { const profile = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as { full_name: string } | null; return [row.number, row.customer_name_snapshot, profile?.full_name ?? "", row.status, row.total, row.created_at]; }); filename = "pedidos";
  } else if (type === "quotes") {
    let query = supabase.from("quotes").select("number, customer_name_snapshot, status, subtotal, tax_total, total, created_at").order("created_at", { ascending: false }); if (from) query = query.gte("created_at", from); if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`); if (status) query = query.eq("status", status as Database["public"]["Enums"]["quote_status"]); if (customerId) query = query.eq("customer_id", customerId); const { data, error } = await query; if (error) return NextResponse.json({ error: "No se ha podido exportar" }, { status: 500 });
    headers = ["Número", "Cliente", "Estado", "Base EUR", "IVA EUR", "Total EUR", "Fecha"]; rows = data.map((row) => [row.number, row.customer_name_snapshot, row.status, row.subtotal, row.tax_total, row.total, row.created_at]); filename = "presupuestos";
  } else if (type === "customers") {
    const { data, error } = await supabase.from("customers").select("id, name, company, email, phone, mobile, address, city, province").is("archived_at", null).order("name"); if (error) return NextResponse.json({ error: "No se ha podido exportar" }, { status: 500 });
    headers = ["Identificador", "Nombre", "Empresa", "Email", "Teléfono", "Móvil", "Dirección", "Población", "Provincia"]; rows = data.map((row) => [row.id, row.name, row.company, row.email, row.phone, row.mobile, row.address, row.city, row.province]); filename = "clientes";
  } else {
    const { data, error } = await supabase.from("products").select("code, name, description, base_price, track_stock, stock_unit, minimum_stock").is("archived_at", null).order("name"); if (error) return NextResponse.json({ error: "No se ha podido exportar" }, { status: 500 });
    headers = ["Código", "Nombre", "Descripción", "Precio base EUR", "Inventariable", "Unidad", "Stock mínimo"]; rows = data.map((row) => [row.code, row.name, row.description, row.base_price, row.track_stock ? "Sí" : "No", row.stock_unit, row.minimum_stock]); filename = "productos";
  }
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(cell).join(";")).join("\r\n")}`;
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"`, "Cache-Control": "no-store" } });
}
