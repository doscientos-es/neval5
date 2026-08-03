"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const supplierSchema = z.object({ name: z.string().trim().min(2).max(160), contactName: z.string().trim().max(160).optional(), phone: z.string().trim().max(40).optional(), email: z.string().trim().email().max(254).optional().or(z.literal("")) });

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

export async function adjustProductStock(productId: string, quantity: number, reason: string): Promise<{ ok: boolean; message: string }> {
  const supabase = await createServerSupabaseClient(); if (!supabase) return { ok: false, message: "La conexión segura no está disponible." };
  const { error } = await supabase.rpc("adjust_stock", { p_product_id: productId, p_quantity: quantity, p_reason: reason, p_idempotency_key: crypto.randomUUID() });
  if (error) return { ok: false, message: "No se ha podido ajustar el stock." }; revalidatePath("/"); return { ok: true, message: "Ajuste de stock registrado." };
}
