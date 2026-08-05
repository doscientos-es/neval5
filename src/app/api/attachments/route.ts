import { createServerSupabaseClient } from "@/lib/supabase/server";

const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return Response.json({ error: "Servicio no configurado" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const form = await request.formData(); const file = form.get("file"); const customerId = form.get("customerId"); const orderId = form.get("orderId");
  if (!(file instanceof File) || !allowed.has(file.type) || file.size > 20 * 1024 * 1024) return Response.json({ error: "El archivo debe ser PDF, imagen o documento Office y no superar 20 MB." }, { status: 400 });
  if ((typeof customerId === "string") === (typeof orderId === "string")) return Response.json({ error: "Asocia el archivo a un cliente o a un pedido." }, { status: 400 });
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) return Response.json({ error: "No perteneces a una empresa." }, { status: 403 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const path = `${membership.organization_id}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("neval-files").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return Response.json({ error: "No se ha podido subir el archivo." }, { status: 400 });
  const { data, error } = await supabase.from("attachments").insert({ organization_id: membership.organization_id, customer_id: customerId || null, order_id: orderId || null, path, filename: file.name, mime_type: file.type, byte_size: file.size, created_by: user.id }).select("id, filename").single();
  if (error) { await supabase.storage.from("neval-files").remove([path]); return Response.json({ error: "No se ha podido registrar el archivo." }, { status: 400 }); }
  return Response.json(data, { status: 201 });
}
