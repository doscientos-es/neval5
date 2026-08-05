"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const organizationSchema = z.object({ name: z.string().trim().min(2).max(160), taxId: z.string().trim().max(40).optional(), timezone: z.literal("Europe/Madrid"), currency: z.literal("EUR") });
const memberSchema = z.object({ userId: z.string().uuid(), role: z.enum(["administrator", "administrative", "production", "cutter", "cnc_operator"]), isSalesRep: z.boolean() });
const inviteSchema = z.object({ email: z.string().trim().email().max(254), fullName: z.string().trim().min(2).max(160), role: z.enum(["administrator", "administrative", "production", "cutter", "cnc_operator"]), isSalesRep: z.boolean() });

async function adminContext() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "La conexión segura con la base de datos no está disponible." } as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." } as const;
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id, role").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership || membership.role !== "administrator") return { error: "Solo un administrador puede modificar esta configuración." } as const;
  return { supabase, organizationId: membership.organization_id } as const;
}

export async function updateOrganization(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = organizationSchema.safeParse({ name: formData.get("name"), taxId: formData.get("taxId") || undefined, timezone: formData.get("timezone"), currency: formData.get("currency") });
  if (!parsed.success) return { ok: false, message: "Revisa los datos de empresa." };
  const context = await adminContext(); if ("error" in context) return { ok: false, message: context.error ?? "No autorizado." };
  const { error } = await context.supabase.from("organizations").update({ name: parsed.data.name, tax_id: parsed.data.taxId || null, timezone: parsed.data.timezone, currency: parsed.data.currency }).eq("id", context.organizationId);
  if (error) return { ok: false, message: "No se han podido guardar los datos de empresa." };
  revalidatePath("/"); return { ok: true, message: "Datos de empresa actualizados." };
}

export async function updateMember(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = memberSchema.safeParse({ userId: formData.get("userId"), role: formData.get("role"), isSalesRep: formData.get("isSalesRep") === "on" });
  if (!parsed.success) return { ok: false, message: "Revisa los permisos del usuario." };
  const context = await adminContext(); if ("error" in context) return { ok: false, message: context.error ?? "No autorizado." };
  const { error: roleError } = await context.supabase.from("organization_memberships").update({ role: parsed.data.role }).eq("organization_id", context.organizationId).eq("user_id", parsed.data.userId);
  if (roleError) return { ok: false, message: "No se ha podido actualizar el rol." };
  const { error: profileError } = await context.supabase.from("profiles").update({ is_sales_rep: parsed.data.isSalesRep }).eq("id", parsed.data.userId);
  if (profileError) return { ok: false, message: "El rol se actualizó, pero no el perfil comercial." };
  revalidatePath("/"); return { ok: true, message: "Permisos de usuario actualizados." };
}

export async function inviteMember(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = inviteSchema.safeParse({ email: formData.get("email"), fullName: formData.get("fullName"), role: formData.get("role"), isSalesRep: formData.get("isSalesRep") === "on" });
  if (!parsed.success) return { ok: false, message: "Revisa el nombre, correo y rol de la invitación." };
  const context = await adminContext(); if ("error" in context) return { ok: false, message: context.error ?? "No autorizado." };
  const { data, error } = await context.supabase.functions.invoke("invite-organization-member", { body: parsed.data });
  if (error) return { ok: false, message: "No se ha podido enviar la invitación." };
  if (!data?.ok) return { ok: false, message: typeof data?.error === "string" ? data.error : "No se ha podido enviar la invitación." };
  revalidatePath("/"); return { ok: true, message: data.message };
}
