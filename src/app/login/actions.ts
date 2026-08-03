"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login?message=Falta%20configurar%20Supabase.");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?message=${encodeURIComponent("Email o contraseña no válidos.")}`);
  redirect(next.startsWith("/") ? next : "/");
}
