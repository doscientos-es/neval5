import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createServerSupabaseClient();
  if (!supabase) return Response.json({ error: "Servicio no configurado" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { data: attachment, error } = await supabase.from("attachments").select("path").eq("id", id).maybeSingle();
  if (error || !attachment) return Response.json({ error: "Archivo no encontrado" }, { status: 404 });
  const { data, error: signedError } = await supabase.storage.from("neval-files").createSignedUrl(attachment.path, 60);
  if (signedError || !data) return Response.json({ error: "No se ha podido preparar la descarga" }, { status: 500 });
  return Response.redirect(data.signedUrl);
}
