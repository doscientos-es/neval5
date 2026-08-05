import { createServerSupabaseClient } from "@/lib/supabase/server";

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export type QuoteSummary = { id: string; number: string; customer: string; status: string; total: string; createdAt: string };
export type OrderSummary = { id: string; number: string; customer: string; status: string; total: string; createdAt: string; salesRepId: string | null; salesRepName: string | null };
export type CommercialData = { quotes: QuoteSummary[]; orders: OrderSummary[]; salesReps: { id: string; name: string }[]; role: "administrator" | "administrative" | "production" | "cutter" | "cnc_operator"; canManage: boolean; isAdministrator: boolean };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export async function getCommercialData(): Promise<CommercialData | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id, role").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) return null;
  const [quotesResult, ordersResult, representativesResult] = await Promise.all([
    supabase.from("quotes").select("id, number, status, total, customer_name_snapshot, created_at").order("created_at", { ascending: false }),
    supabase.from("orders").select("id, number, status, total, customer_name_snapshot, created_at, sales_rep_id, profiles!orders_sales_rep_id_fkey(full_name)").order("created_at", { ascending: false }),
    supabase.from("organization_memberships").select("user_id, profiles(full_name, is_sales_rep)").eq("organization_id", membership.organization_id).order("created_at"),
  ]);
  if (quotesResult.error || ordersResult.error || representativesResult.error) throw new Error("No se han podido cargar los documentos comerciales.");
  return {
    quotes: quotesResult.data.map((quote) => ({ id: quote.id, number: quote.number, status: quote.status, customer: quote.customer_name_snapshot, total: euro.format(Number(quote.total)), createdAt: formatDate(quote.created_at) })),
    orders: ordersResult.data.map((order) => {
      const profile = (Array.isArray(order.profiles) ? order.profiles[0] : order.profiles) as { full_name: string } | null;
      return { id: order.id, number: order.number, status: order.status, customer: order.customer_name_snapshot, total: euro.format(Number(order.total)), createdAt: formatDate(order.created_at), salesRepId: order.sales_rep_id, salesRepName: profile?.full_name ?? null };
    }),
    salesReps: representativesResult.data.flatMap((member) => {
      const profile = (Array.isArray(member.profiles) ? member.profiles[0] : member.profiles) as { full_name: string; is_sales_rep: boolean } | null;
      return profile?.is_sales_rep ? [{ id: member.user_id, name: profile.full_name }] : [];
    }),
    role: membership.role,
    canManage: ["administrator", "administrative"].includes(membership.role),
    isAdministrator: membership.role === "administrator",
  };
}
