"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const supplierSchema = z.object({ name: z.string().trim().min(2).max(160), contactName: z.string().trim().max(160).optional(), phone: z.string().trim().max(40).optional(), email: z.string().trim().email().max(254).optional().or(z.literal("")) });
const purchaseLineSchema = z.object({ productId: z.string().uuid(), quantity: z.coerce.number().positive(), unitPrice: z.coerce.number().min(0) });
const purchaseSchema = z.object({ supplierId: z.string().uuid(), lines: z.array(purchaseLineSchema).min(1), notes: z.string().trim().max(4000).optional() });

export async function createSupplier(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = supplierSchema.safeParse({ name: formData.get("name"), contactName: formData.get("contactName") || undefined, phone: formData.get("phone") || undefined, email: formData.get("email") || undefined });
  if (!parsed.success) return { ok: false, message: "Revisa los datos del proveedor." };
  const supabase = await createServerSupabaseClient(); if (!supabase) return { ok: false, message: "La conexión segura no está disponible." };
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return { ok: false, message: "Tu sesión ha caducado." };
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) return { ok: false, message: "No perteneces a una empresa." };
  const { error } = await supabase.from("suppliers").insert({ organization_id: membership.organization_id, name: parsed.data.name, contact_name: parsed.data.contactName || null, phone: parsed.data.phone || null, email: parsed.data.email || null });
  if (error?.code === "23505") return { ok: false, message: "Ya existe ese proveedor." }; if (error) return { ok: false, message: "No se ha podido guardar el proveedor." };
  revalidatePath("/"); return { ok: true, message: "Proveedor guardado." };
}

async function supplierContext() {
  const supabase = await createServerSupabaseClient(); if (!supabase) return { error: "La conexión segura no está disponible." } as const;
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return { error: "Tu sesión ha caducado." } as const;
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) return { error: "No perteneces a una empresa." } as const;
  return { supabase, organizationId: membership.organization_id } as const;
}

export async function updateSupplier(supplierId: string, formData: FormData): Promise<{ ok: boolean; message: string }> {
  if (!z.string().uuid().safeParse(supplierId).success) return { ok: false, message: "El proveedor no es válido." };
  const parsed = supplierSchema.safeParse({ name: formData.get("name"), contactName: formData.get("contactName") || undefined, phone: formData.get("phone") || undefined, email: formData.get("email") || undefined });
  if (!parsed.success) return { ok: false, message: "Revisa los datos del proveedor." };
  const context = await supplierContext(); if ("error" in context) return { ok: false, message: context.error ?? "No se ha podido identificar la empresa." };
  const { data, error } = await context.supabase.from("suppliers").update({ name: parsed.data.name, contact_name: parsed.data.contactName || null, phone: parsed.data.phone || null, email: parsed.data.email || null }).eq("id", supplierId).eq("organization_id", context.organizationId).is("archived_at", null).select("id").maybeSingle();
  if (error?.code === "23505") return { ok: false, message: "Ya existe ese proveedor." };
  if (error || !data) return { ok: false, message: "No se ha podido actualizar el proveedor." };
  revalidatePath("/"); return { ok: true, message: "Proveedor actualizado." };
}

export async function archiveSupplier(supplierId: string): Promise<{ ok: boolean; message: string }> {
  if (!z.string().uuid().safeParse(supplierId).success) return { ok: false, message: "El proveedor no es válido." };
  const context = await supplierContext(); if ("error" in context) return { ok: false, message: context.error ?? "No se ha podido identificar la empresa." };
  const { data, error } = await context.supabase.from("suppliers").update({ archived_at: new Date().toISOString() }).eq("id", supplierId).eq("organization_id", context.organizationId).is("archived_at", null).select("id").maybeSingle();
  if (error || !data) return { ok: false, message: "No se ha podido archivar el proveedor." };
  revalidatePath("/"); return { ok: true, message: "Proveedor archivado. Las compras históricas se conservan." };
}

export async function adjustProductStock(productId: string, quantity: number, reason: string, idempotencyKey: string): Promise<{ ok: boolean; message: string }> {
  if (!z.string().uuid().safeParse(idempotencyKey).success) return { ok: false, message: "La operación de ajuste no es válida." };
  const supabase = await createServerSupabaseClient(); if (!supabase) return { ok: false, message: "La conexión segura no está disponible." };
  const { error } = await supabase.rpc("adjust_stock", { p_product_id: productId, p_quantity: quantity, p_reason: reason, p_idempotency_key: idempotencyKey });
  if (error) return { ok: false, message: "No se ha podido ajustar el stock." }; revalidatePath("/"); return { ok: true, message: "Ajuste de stock registrado." };
}

export async function createPurchaseOrder(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const productIds = formData.getAll("productId"); const quantities = formData.getAll("quantity"); const unitPrices = formData.getAll("unitPrice");
  const parsed = purchaseSchema.safeParse({ supplierId: formData.get("supplierId"), lines: productIds.map((productId, index) => ({ productId, quantity: quantities[index], unitPrice: unitPrices[index] })), notes: formData.get("notes") || undefined });
  if (!parsed.success) return { ok: false, message: "Revisa los datos del pedido de compra." };
  const supabase = await createServerSupabaseClient(); if (!supabase) return { ok: false, message: "La conexión segura no está disponible." };
  const { error } = await supabase.rpc("create_purchase_order", { p_supplier_id: parsed.data.supplierId, p_notes: parsed.data.notes || "", p_lines: parsed.data.lines.map((line) => ({ product_id: line.productId, quantity: line.quantity, unit_price: line.unitPrice })) });
  if (error) return { ok: false, message: "No se ha podido crear el pedido de compra." };
  revalidatePath("/"); return { ok: true, message: "Pedido de compra creado." };
}

export async function changePurchaseOrderStatus(purchaseOrderId: string, status: "requested" | "cancelled"): Promise<{ ok: boolean; message: string }> {
  if (!z.string().uuid().safeParse(purchaseOrderId).success) return { ok: false, message: "El pedido de compra no es válido." };
  const supabase = await createServerSupabaseClient(); if (!supabase) return { ok: false, message: "La conexión segura no está disponible." };
  const { error } = await supabase.rpc("set_purchase_order_status", { p_purchase_order_id: purchaseOrderId, p_status: status });
  if (error) return { ok: false, message: status === "requested" ? "No se ha podido solicitar el pedido de compra." : "No se ha podido cancelar el pedido de compra." };
  revalidatePath("/"); return { ok: true, message: status === "requested" ? "Pedido de compra marcado como solicitado." : "Pedido de compra cancelado." };
}

export async function receivePurchaseOrder(purchaseOrderId: string, lineId: string, quantity: number, idempotencyKey: string): Promise<{ ok: boolean; message: string }> {
  if (!Number.isFinite(quantity) || quantity <= 0 || !z.string().uuid().safeParse(idempotencyKey).success) return { ok: false, message: "Indica una cantidad válida." };
  const supabase = await createServerSupabaseClient(); if (!supabase) return { ok: false, message: "La conexión segura no está disponible." };
  const { error } = await supabase.rpc("receive_purchase_order", { p_purchase_order_id: purchaseOrderId, p_idempotency_key: idempotencyKey, p_lines: [{ purchase_order_line_id: lineId, quantity }] });
  if (error) return { ok: false, message: "No se ha podido registrar la recepción." };
  revalidatePath("/"); return { ok: true, message: "Recepción registrada y stock actualizado." };
}
