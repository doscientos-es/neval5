import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type InvitePayload = {
  email?: unknown;
  fullName?: unknown;
  role?: unknown;
  isSalesRep?: unknown;
};

const roles = new Set(["administrator", "administrative", "production", "cutter", "cnc_operator"]);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sesión no válida." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) return json({ error: "La invitación no está disponible temporalmente." }, 503);

  const userClient = createClient(url, anonKey, { global: { headers: { authorization } } });
  const token = authorization.slice("Bearer ".length);
  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) return json({ error: "Sesión no válida." }, 401);

  let payload: InvitePayload;
  try { payload = await request.json(); } catch { return json({ error: "Datos de invitación no válidos." }, 400); }
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const fullName = typeof payload.fullName === "string" ? payload.fullName.trim() : "";
  const role = typeof payload.role === "string" ? payload.role : "";
  const isSalesRep = payload.isSalesRep === true;
  if (!/^\S+@\S+\.\S+$/.test(email) || fullName.length < 2 || fullName.length > 160 || !roles.has(role)) {
    return json({ error: "Revisa el nombre, correo y rol de la invitación." }, 400);
  }

  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: callerMembership, error: callerError } = await admin
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("role", "administrator")
    .limit(1)
    .maybeSingle();
  if (callerError || !callerMembership) return json({ error: "Solo un administrador puede invitar usuarios." }, 403);

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: "https://neval5.vercel.app/auth/callback",
  });
  if (inviteError || !invited.user) {
    const message = inviteError?.message?.toLowerCase().includes("already")
      ? "Ese correo ya dispone de una cuenta."
      : "No se ha podido enviar la invitación.";
    return json({ error: message }, 400);
  }

  const { error: membershipError } = await admin.from("organization_memberships").upsert({
    organization_id: callerMembership.organization_id,
    user_id: invited.user.id,
    role,
  }, { onConflict: "organization_id,user_id" });
  if (membershipError) return json({ error: "La invitación se creó, pero no se pudo asignar a la empresa." }, 500);

  const { error: profileError } = await admin.from("profiles").update({ is_sales_rep: isSalesRep }).eq("id", invited.user.id);
  if (profileError) return json({ error: "La invitación se creó, pero no se pudo configurar el perfil comercial." }, 500);

  await admin.from("audit_events").insert({
    organization_id: callerMembership.organization_id,
    actor_id: user.id,
    entity_type: "organization_membership",
    entity_id: invited.user.id,
    action: "invited",
    payload: { email, role, is_sales_rep: isSalesRep },
  });

  return json({ ok: true, message: "Invitación enviada y acceso asignado." });
});
