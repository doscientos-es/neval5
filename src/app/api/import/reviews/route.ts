import { createServerSupabaseClient } from "@/lib/supabase/server";

type CustomerPayload = { nombre?: string; empresa?: string; email?: string; telefono?: string; movil?: string; direccion?: string; poblacion?: string; provincia?: string };

async function context() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Servicio no configurado" } as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" } as const;
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) return { error: "No perteneces a una empresa." } as const;
  return { supabase, user, organizationId: membership.organization_id } as const;
}

export async function GET() {
  const current = await context(); if ("error" in current) return Response.json({ error: current.error }, { status: current.error === "No autorizado" ? 401 : 403 });
  const { data, error } = await current.supabase.from("import_reviews").select("id, payload, reason, created_at").eq("organization_id", current.organizationId).eq("status", "pending").order("created_at", { ascending: false });
  if (error) return Response.json({ error: "No se han podido cargar las revisiones." }, { status: 400 });
  return Response.json({ reviews: data });
}

export async function PATCH(request: Request) {
  const current = await context(); if ("error" in current) return Response.json({ error: current.error }, { status: current.error === "No autorizado" ? 401 : 403 });
  const body = await request.json().catch(() => null) as { id?: string; decision?: "create" | "skip" } | null;
  if (!body?.id || !["create", "skip"].includes(body.decision ?? "")) return Response.json({ error: "Solicitud de revisión inválida." }, { status: 400 });
  const { data: review, error } = await current.supabase.from("import_reviews").select("id, payload").eq("id", body.id).eq("organization_id", current.organizationId).eq("status", "pending").maybeSingle();
  if (error || !review) return Response.json({ error: "La revisión ya no está disponible." }, { status: 404 });
  if (body.decision === "create") {
    const payload = review.payload as CustomerPayload;
    if (!payload.nombre?.trim()) return Response.json({ error: "El registro revisado no tiene nombre." }, { status: 422 });
    const { error: insertError } = await current.supabase.from("customers").insert({ organization_id: current.organizationId, name: payload.nombre.trim(), company: payload.empresa?.trim() || null, email: payload.email?.trim() || null, phone: payload.telefono?.trim() || null, mobile: payload.movil?.trim() || null, address: payload.direccion?.trim() || null, city: payload.poblacion?.trim() || null, province: payload.provincia?.trim() || null });
    if (insertError) return Response.json({ error: "No se ha podido crear el cliente revisado." }, { status: 400 });
  }
  const { error: updateError } = await current.supabase.from("import_reviews").update({ status: body.decision === "create" ? "created" : "skipped", resolved_by: current.user.id, resolved_at: new Date().toISOString() }).eq("id", review.id).eq("organization_id", current.organizationId);
  if (updateError) return Response.json({ error: "No se ha podido cerrar la revisión." }, { status: 400 });
  return Response.json({ ok: true });
}
