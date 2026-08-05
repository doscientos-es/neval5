"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toCustomerSummary, type CustomerSummary } from "@/features/customers/customer-repository";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Indica el nombre del cliente.").max(160),
  company: z.string().trim().max(160).optional(),
  address: z.string().trim().max(240).optional(),
  city: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(40).optional(),
  mobile: z.string().trim().max(40).optional(),
  email: z.string().trim().email("Indica un correo válido.").max(254).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional(),
  priceListId: z.string().uuid().optional().or(z.literal("")),
});

export type CreateCustomerResult =
  | { ok: true; customer: CustomerSummary }
  | { ok: false; message: string };

type CustomerMutationResult = CreateCustomerResult;

function valuesFrom(formData: FormData) {
  return {
    name: formData.get("name"), company: formData.get("company") || undefined,
    address: formData.get("address") || undefined, city: formData.get("city") || undefined,
    province: formData.get("province") || undefined, phone: formData.get("phone") || undefined,
    mobile: formData.get("mobile") || undefined, email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
    priceListId: formData.get("priceListId") || "",
  };
}

function databaseValues(data: z.infer<typeof customerSchema>) {
  return {
    name: data.name, company: data.company || null, address: data.address || null,
    city: data.city || null, province: data.province || null, phone: data.phone || null,
    mobile: data.mobile || null, email: data.email || null, notes: data.notes || null,
    price_list_id: data.priceListId || null,
  };
}

export async function createCustomer(formData: FormData): Promise<CreateCustomerResult> {
  const parsed = customerSchema.safeParse(valuesFrom(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del cliente." };

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
    .insert({ organization_id: membership.organization_id, ...databaseValues(parsed.data) })
    .select("id, name, company, address, city, province, phone, mobile, email, notes, price_list_id")
    .single();
  if (error) return { ok: false, message: "No se ha podido guardar el cliente." };

  revalidatePath("/");
  return { ok: true, customer: toCustomerSummary(inserted) };
}

export async function updateCustomer(customerId: string, formData: FormData): Promise<CustomerMutationResult> {
  const parsed = customerSchema.safeParse(valuesFrom(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del cliente." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "La conexión segura con la base de datos no está disponible." };

  const { data, error } = await supabase
    .from("customers")
    .update(databaseValues(parsed.data))
    .eq("id", customerId)
    .is("archived_at", null)
    .select("id, name, company, address, city, province, phone, mobile, email, notes, price_list_id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "No se ha podido actualizar el cliente." };
  revalidatePath("/");
  return { ok: true, customer: toCustomerSummary(data) };
}

export async function archiveCustomer(customerId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "La conexión segura con la base de datos no está disponible." };
  const { data, error } = await supabase
    .from("customers")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", customerId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "No se ha podido archivar el cliente." };
  revalidatePath("/");
  return { ok: true };
}
