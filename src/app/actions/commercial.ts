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
  const { data, error } = await supabase.rpc("create_quote", { p_customer_id: parsed.data.customerId, p_notes: parsed.data.notes || null, p_global_discount_pct: parsed.data.globalDiscount, p_lines: parsed.data.lines.map((line) => ({ product_id: line.productId || null, description: line.description, quantity: line.quantity, unit: line.unit, unit_price: line.unitPrice, discount_pct: line.lineDiscount, tax_rate: line.taxRate })) });
  if (error) return { ok: false, message: "No se ha podido crear el presupuesto." };
  revalidatePath("/");
  return { ok: true, id: data, message: "Presupuesto creado correctamente." };
}

export async function createManualOrder(formData: FormData): Promise<Result> {
  const parsed = quoteSchema.safeParse(parseDocument(formData, false));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa el pedido." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "La conexión segura con la base de datos no está disponible." };
  const { data, error } = await supabase.rpc("create_order", { p_customer_id: parsed.data.customerId, p_notes: parsed.data.notes || null, p_lines: parsed.data.lines.map((line) => ({ product_id: line.productId || null, description: line.description, quantity: line.quantity, unit: line.unit, unit_price: line.unitPrice, discount_pct: line.lineDiscount, tax_rate: line.taxRate })) });
  if (error) return { ok: false, message: "No se ha podido crear el pedido." };
  revalidatePath("/"); return { ok: true, id: data, message: "Pedido creado correctamente." };
}

function parseDocument(formData: FormData, includeDiscount: boolean) {
  const raw = formData.get("lines");
  try {
    const descriptions = formData.getAll("description"); const products = formData.getAll("productId"); const quantities = formData.getAll("quantity"); const units = formData.getAll("unit"); const prices = formData.getAll("unitPrice"); const discounts = formData.getAll("lineDiscount"); const taxes = formData.getAll("taxRate");
    const lines = typeof raw === "string" && raw ? JSON.parse(raw) : descriptions.map((description, index) => ({ productId: products[index] || undefined, description, quantity: quantities[index], unit: units[index] || "ud", unitPrice: prices[index], lineDiscount: discounts[index] || 0, taxRate: taxes[index] || 21 }));
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
