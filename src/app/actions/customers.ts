"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Indica el nombre del cliente.").max(160),
  company: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
});

export type CreateCustomerResult =
  | { ok: true; customer: { id: string; initials: string; name: string; company: string; phone: string; total: string; orders: number } }
  | { ok: false; message: string };

export async function createCustomer(formData: FormData): Promise<CreateCustomerResult> {
  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") || undefined,
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del cliente." };

  const { name, company, phone } = parsed.data;
  const customer = {
    id: crypto.randomUUID(),
    initials: name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
    name,
    company: company || "Cliente particular",
    phone: phone || "Sin teléfono",
    total: "0 €",
    orders: 0,
  };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "La conexión segura con la base de datos no está disponible." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership) return { ok: false, message: "Tu usuario no pertenece todavía a una empresa." };

  const { data: inserted, error } = await supabase
    .from("customers")
    .insert({ organization_id: membership.organization_id, name, company: company || null, phone: phone || null })
    .select("id")
    .single();
  if (error) return { ok: false, message: "No se ha podido guardar el cliente." };

  revalidatePath("/");
  return { ok: true, customer: { ...customer, id: inserted.id } };
}
