"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const productSchema = z.object({
  code: z.string().trim().min(1, "Indica un código.").max(80),
  name: z.string().trim().min(2, "Indica el nombre del producto.").max(160),
  description: z.string().trim().max(2000).optional(),
  basePrice: z.coerce.number().min(0, "El precio no puede ser negativo.").max(999999999),
  trackStock: z.boolean(),
  stockUnit: z.string().trim().min(1).max(20),
  minimumStock: z.coerce.number().min(0, "El stock mínimo no puede ser negativo."),
  familyId: z.string().uuid().optional(),
  taxRateId: z.string().uuid().optional(),
});

const familySchema = z.object({ name: z.string().trim().min(2, "Indica el nombre de la familia.").max(120) });
const taxSchema = z.object({ name: z.string().trim().min(2, "Indica el nombre del impuesto.").max(80), rate: z.coerce.number().min(0).max(100), isDefault: z.boolean() });

async function currentOrganization() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "La conexión segura con la base de datos no está disponible." } as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." } as const;
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) return { error: "Tu usuario no pertenece todavía a una empresa." } as const;
  return { supabase, organizationId: membership.organization_id } as const;
}

export async function createProduct(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = productSchema.safeParse({
    code: formData.get("code"), name: formData.get("name"), description: formData.get("description") || undefined,
    basePrice: formData.get("basePrice"), trackStock: formData.get("trackStock") === "on",
    stockUnit: formData.get("stockUnit") || "ud", minimumStock: formData.get("minimumStock") || 0,
    familyId: formData.get("familyId") || undefined, taxRateId: formData.get("taxRateId") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del producto." };
  const context = await currentOrganization();
  if ("error" in context) return { ok: false, message: context.error ?? "No se ha podido identificar la empresa." };
  const { error } = await context.supabase.from("products").insert({
    organization_id: context.organizationId, code: parsed.data.code, name: parsed.data.name,
    description: parsed.data.description || null, base_price: parsed.data.basePrice, track_stock: parsed.data.trackStock,
    stock_unit: parsed.data.stockUnit, minimum_stock: parsed.data.minimumStock,
    family_id: parsed.data.familyId || null, default_tax_rate_id: parsed.data.taxRateId || null,
  });
  if (error?.code === "23505") return { ok: false, message: "Ya existe un producto con ese código." };
  if (error) return { ok: false, message: "No se ha podido guardar el producto." };
  revalidatePath("/");
  return { ok: true, message: "Producto guardado correctamente." };
}

export async function createProductFamily(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = familySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa la familia." };
  const context = await currentOrganization(); if ("error" in context) return { ok: false, message: context.error ?? "No se ha podido identificar la empresa." };
  const { error } = await context.supabase.from("product_families").insert({ organization_id: context.organizationId, name: parsed.data.name });
  if (error?.code === "23505") return { ok: false, message: "Ya existe una familia con ese nombre." };
  if (error) return { ok: false, message: "No se ha podido guardar la familia." };
  revalidatePath("/"); return { ok: true, message: "Familia creada." };
}

export async function createTaxRate(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = taxSchema.safeParse({ name: formData.get("name"), rate: formData.get("rate"), isDefault: formData.get("isDefault") === "on" });
  if (!parsed.success) return { ok: false, message: "Revisa el tipo de IVA." };
  const context = await currentOrganization(); if ("error" in context) return { ok: false, message: context.error ?? "No se ha podido identificar la empresa." };
  if (parsed.data.isDefault) {
    const { error: resetError } = await context.supabase.from("tax_rates").update({ is_default: false }).eq("organization_id", context.organizationId);
    if (resetError) return { ok: false, message: "No se ha podido actualizar el IVA por defecto." };
  }
  const { error } = await context.supabase.from("tax_rates").insert({ organization_id: context.organizationId, name: parsed.data.name, rate: parsed.data.rate, is_default: parsed.data.isDefault });
  if (error?.code === "23505") return { ok: false, message: "Ya existe un IVA con ese nombre." };
  if (error) return { ok: false, message: "No se ha podido guardar el IVA." };
  revalidatePath("/"); return { ok: true, message: "Tipo de IVA creado." };
}
