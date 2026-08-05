import { isSupportedImportFile, readImportHeaders } from "@/lib/import-file";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return Response.json({ error: "Servicio no configurado" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || file.size > 20 * 1024 * 1024 || !isSupportedImportFile(file)) {
    return Response.json({ error: "Selecciona un CSV o Excel (.xlsx) de hasta 20 MB." }, { status: 400 });
  }
  try {
    const headers = await readImportHeaders(file);
    if (!headers.length) return Response.json({ error: "El archivo no contiene cabeceras." }, { status: 400 });
    return Response.json({ headers });
  } catch {
    return Response.json({ error: "No se ha podido leer el archivo de Excel." }, { status: 400 });
  }
}
