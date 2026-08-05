import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ConfigurationData = {
  organization: { id: string; name: string; taxId: string; timezone: string; currency: string };
  members: { id: string; name: string; role: "administrator" | "administrative" | "production" | "cutter" | "cnc_operator"; isSalesRep: boolean }[];
  canAdminister: boolean;
};

export async function getConfigurationData(): Promise<ConfigurationData | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: mine, error: mineError } = await supabase.from("organization_memberships").select("organization_id, role").eq("user_id", user.id).limit(1).maybeSingle();
  if (mineError || !mine) return null;
  const [{ data: organization, error: organizationError }, { data: memberships, error: membersError }] = await Promise.all([
    supabase.from("organizations").select("id, name, tax_id, timezone, currency").eq("id", mine.organization_id).single(),
    supabase.from("organization_memberships").select("user_id, role, profiles(full_name, is_sales_rep)").eq("organization_id", mine.organization_id).order("created_at"),
  ]);
  if (organizationError || membersError || !organization) throw new Error("No se ha podido cargar la configuración.");
  return {
    organization: { id: organization.id, name: organization.name, taxId: organization.tax_id || "", timezone: organization.timezone, currency: organization.currency },
    members: memberships.map((member) => {
      const profile = (Array.isArray(member.profiles) ? member.profiles[0] : member.profiles) as { full_name: string; is_sales_rep: boolean } | null;
      return { id: member.user_id, name: profile?.full_name || "Usuario", role: member.role, isSalesRep: profile?.is_sales_rep ?? false };
    }),
    canAdminister: mine.role === "administrator",
  };
}
