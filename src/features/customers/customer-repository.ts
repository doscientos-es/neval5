import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CustomerSummary = {
  id: string;
  initials: string;
  name: string;
  company: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  mobile: string;
  email: string;
  notes: string;
  total: string;
  orders: number;
};

export function toCustomerSummary(customer: {
  id: string;
  name: string;
  company: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  notes: string | null;
}): CustomerSummary {
  return {
    id: customer.id,
    initials: customer.name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
    name: customer.name,
    company: customer.company || "Cliente particular",
    phone: customer.mobile || customer.phone || "Sin teléfono",
    address: customer.address || "",
    city: customer.city || "",
    province: customer.province || "",
    mobile: customer.mobile || "",
    email: customer.email || "",
    notes: customer.notes || "",
    total: "—",
    orders: 0,
  };
}

export async function listCustomerSummaries(): Promise<CustomerSummary[] | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, company, address, city, province, phone, mobile, email, notes")
    .is("archived_at", null)
    .order("name");
  if (error) throw new Error("No se han podido cargar los clientes.");

  return data.map(toCustomerSummary);
}
