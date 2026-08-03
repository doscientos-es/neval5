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

export async function createProduct(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = productSchema.safeParse({
    code: formData.get("code"), name: formData.get("name"), description: formData.get("description") || undefined,
    basePrice: formData.get("basePrice"), trackStock: formData.get("trackStock") === "on",
    stockUnit: formData.get("stockUnit") || "ud", minimumStock: formData.get("minimumStock") || 0,
    familyId: formData.get("familyId") || undefined, taxRateId: formData.get("taxRateId") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del producto." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "La conexión segura con la base de datos no está disponible." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Tu sesión ha caducado. Vuelve a iniciar sesión." };
  const { data: membership, error: membershipError } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (membershipError || !membership) return { ok: false, message: "Tu usuario no pertenece todavía a una empresa." };
  const { error } = await supabase.from("products").insert({
    organization_id: membership.organization_id, code: parsed.data.code, name: parsed.data.name,
    description: parsed.data.description || null, base_price: parsed.data.basePrice, track_stock: parsed.data.trackStock,
    stock_unit: parsed.data.stockUnit, minimum_stock: parsed.data.minimumStock,
    family_id: parsed.data.familyId || null, default_tax_rate_id: parsed.data.taxRateId || null,
  });
  if (error?.code === "23505") return { ok: false, message: "Ya existe un producto con ese código." };
  if (error) return { ok: false, message: "No se ha podido guardar el producto." };
  revalidatePath("/");
  return { ok: true, message: "Producto guardado correctamente." };
}
