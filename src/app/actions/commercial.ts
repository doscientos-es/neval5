"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const lineSchema = z.object({ productId: z.string().uuid().optional(), description: z.string().trim().min(1, "Indica la descripción de la línea.").max(500), quantity: z.coerce.number().positive("La cantidad debe ser mayor que cero."), unit: z.string().trim().min(1).max(20), unitPrice: z.coerce.number().min(0), lineDiscount: z.coerce.number().min(0).max(100), taxRate: z.coerce.number().min(0).max(100) });
const quoteSchema = z.object({ customerId: z.string().uuid(), notes: z.string().trim().max(4000).optional(), globalDiscount: z.coerce.number().min(0).max(100), lines: z.array(lineSchema).min(1) });

type Result = { ok: true; id: string; message: string } | { ok: false; message: string };

export async function createQuote(formData: FormData): Promise<Result> {
  const parsed = quoteSchema.safeParse(parseDocument(formData, true));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa el presupuesto." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "La conexión segura con la base de datos no está disponible." };
  const lines = await resolveTariffPrices(supabase, parsed.data.customerId, parsed.data.lines);
  const { data, error } = await supabase.rpc("create_quote", { p_customer_id: parsed.data.customerId, p_notes: parsed.data.notes || null, p_global_discount_pct: parsed.data.globalDiscount, p_lines: lines.map((line) => ({ product_id: line.productId || null, description: line.description, quantity: line.quantity, unit: line.unit, unit_price: line.unitPrice, discount_pct: line.lineDiscount, tax_rate: line.taxRate })) });
  if (error) return { ok: false, message: "No se ha podido crear el presupuesto." };
  revalidatePath("/");
  return { ok: true, id: data, message: "Presupuesto creado correctamente." };
}

export async function createManualOrder(formData: FormData): Promise<Result> {
  const parsed = quoteSchema.safeParse(parseDocument(formData, false));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa el pedido." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "La conexión segura con la base de datos no está disponible." };
  const lines = await resolveTariffPrices(supabase, parsed.data.customerId, parsed.data.lines);
  const { data, error } = await supabase.rpc("create_order", { p_customer_id: parsed.data.customerId, p_notes: parsed.data.notes || null, p_lines: lines.map((line) => ({ product_id: line.productId || null, description: line.description, quantity: line.quantity, unit: line.unit, unit_price: line.unitPrice, discount_pct: line.lineDiscount, tax_rate: line.taxRate })) });
  if (error) return { ok: false, message: "No se ha podido crear el pedido." };
  revalidatePath("/"); return { ok: true, id: data, message: "Pedido creado correctamente." };
}

async function resolveTariffPrices(supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>, customerId: string, lines: z.infer<typeof lineSchema>[]) {
  const { data: customer } = await supabase.from("customers").select("price_list_id").eq("id", customerId).maybeSingle();
  if (!customer?.price_list_id) return lines;
  const productIds = lines.flatMap((line) => line.productId ? [line.productId] : []);
  if (!productIds.length) return lines;
  const { data: prices } = await supabase.from("price_list_items").select("product_id, unit_price").eq("price_list_id", customer.price_list_id).in("product_id", productIds);
  const mapped = new Map(prices?.map((price) => [price.product_id, Number(price.unit_price)]) ?? []);
  return lines.map((line) => line.productId && mapped.has(line.productId) ? { ...line, unitPrice: mapped.get(line.productId)! } : line);
}

function parseDocument(formData: FormData, includeDiscount: boolean) {
  const raw = formData.get("lines");
  try {
    const descriptions = formData.getAll("description"); const products = formData.getAll("productId"); const quantities = formData.getAll("quantity"); const units = formData.getAll("unit"); const prices = formData.getAll("unitPrice"); const discounts = formData.getAll("lineDiscount"); const taxes = formData.getAll("taxRate");
    const lines = (typeof raw === "string" && raw ? JSON.parse(raw) : descriptions.map((description, index) => ({ productId: products[index] || undefined, description, quantity: quantities[index], unit: units[index] || "ud", unitPrice: prices[index], lineDiscount: discounts[index] || 0, taxRate: taxes[index] || 21 }))).filter((line: { description?: unknown }) => typeof line.description === "string" && line.description.trim().length > 0);
    return { customerId: formData.get("customerId"), notes: formData.get("notes") || undefined, globalDiscount: includeDiscount ? formData.get("globalDiscount") || 0 : 0, lines };
  } catch { return { customerId: "", notes: undefined, globalDiscount: 0, lines: [] }; }
}

export async function convertQuote(quoteId: string): Promise<Result> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "La conexión segura con la base de datos no está disponible." };
  const { data, error } = await supabase.rpc("convert_quote_to_order", { p_quote_id: quoteId });
  if (error) return { ok: false, message: "No se ha podido convertir el presupuesto." };
  revalidatePath("/");
  return { ok: true, id: data, message: "Pedido creado desde el presupuesto." };
}

export async function changeQuoteStatus(quoteId: string, status: "draft" | "sent" | "accepted" | "rejected" | "expired"): Promise<Result> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "La conexión segura con la base de datos no está disponible." };
  const { data, error } = await supabase.rpc("set_quote_status", { p_quote_id: quoteId, p_status: status });
  if (error) return { ok: false, message: "No se ha podido actualizar el estado del presupuesto." };
  revalidatePath("/"); return { ok: true, id: data, message: "Estado del presupuesto actualizado." };
}

export async function changeOrderStatus(orderId: string, status: "pending" | "in_manufacturing" | "ready" | "delivered"): Promise<Result> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "La conexión segura con la base de datos no está disponible." };
  const { data, error } = await supabase.rpc("set_order_status", { p_order_id: orderId, p_status: status, p_reason: null });
  if (error) return { ok: false, message: "No se ha podido actualizar el pedido." };
  revalidatePath("/");
  return { ok: true, id: data, message: "Estado del pedido actualizado." };
}

export async function duplicateOrder(orderId: string): Promise<Result> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "La conexión segura con la base de datos no está disponible." };
  const { data, error } = await supabase.rpc("duplicate_order", { p_order_id: orderId });
  if (error) return { ok: false, message: "No se ha podido duplicar el pedido." };
  revalidatePath("/");
  return { ok: true, id: data, message: "Pedido duplicado en estado Pendiente." };
}

export async function assignOrderSalesRep(orderId: string, salesRepId: string | null): Promise<Result> {
  if (!z.string().uuid().safeParse(orderId).success || (salesRepId !== null && !z.string().uuid().safeParse(salesRepId).success)) return { ok: false, message: "El comercial seleccionado no es válido." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "La conexión segura con la base de datos no está disponible." };
  const { data, error } = await supabase.rpc("assign_order_sales_rep", { p_order_id: orderId, p_sales_rep_id: salesRepId });
  if (error) return { ok: false, message: "No se ha podido asignar el comercial." };
  revalidatePath("/"); return { ok: true, id: data, message: salesRepId ? "Comercial asignado al pedido." : "Comercial retirado del pedido." };
}

export async function getOrderHistory(orderId: string): Promise<{ ok: true; events: { id: string; type: string; createdAt: string; payload: Record<string, unknown> }[] } | { ok: false; message: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "La conexión segura con la base de datos no está disponible." };
  const { data, error } = await supabase.from("order_events").select("id, event_type, payload, created_at").eq("order_id", orderId).order("created_at", { ascending: false });
  if (error) return { ok: false, message: "No se ha podido cargar el historial." };
  return { ok: true, events: data.map((event) => ({ id: event.id, type: event.event_type, payload: event.payload as Record<string, unknown>, createdAt: event.created_at })) };
}
