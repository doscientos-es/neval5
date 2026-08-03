import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CustomerSummary = {
  id: string;
  initials: string;
  name: string;
  company: string;
  phone: string;
  total: string;
  orders: number;
};

export async function listCustomerSummaries(): Promise<CustomerSummary[] | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, company, phone, mobile")
    .is("archived_at", null)
    .order("name");
  if (error) throw new Error("No se han podido cargar los clientes.");

  return data.map((customer) => ({
    id: customer.id,
    initials: customer.name.split(" ").map((word: string) => word[0]).join("").slice(0, 2).toUpperCase(),
    name: customer.name,
    company: customer.company || "Cliente particular",
    phone: customer.mobile || customer.phone || "Sin teléfono",
    total: "—",
    orders: 0,
  }));
}
