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
  priceListId: string;
  total: string;
  orders: number;
  quotes: number;
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
  price_list_id?: string | null;
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
    priceListId: customer.price_list_id || "",
    total: "—",
    orders: 0,
    quotes: 0,
  };
}

export async function listCustomerSummaries(): Promise<CustomerSummary[] | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [customersResult, ordersResult, quotesResult] = await Promise.all([
    supabase.from("customers").select("id, name, company, address, city, province, phone, mobile, email, notes, price_list_id").is("archived_at", null).order("name"),
    supabase.from("orders").select("customer_id, total"),
    supabase.from("quotes").select("customer_id"),
  ]);
  if (customersResult.error || ordersResult.error || quotesResult.error) throw new Error("No se han podido cargar los clientes.");

  const history = new Map<string, { orders: number; quotes: number; total: number }>();
  for (const order of ordersResult.data) {
    const current = history.get(order.customer_id) ?? { orders: 0, quotes: 0, total: 0 };
    current.orders += 1;
    current.total += Number(order.total);
    history.set(order.customer_id, current);
  }
  for (const quote of quotesResult.data) {
    const current = history.get(quote.customer_id) ?? { orders: 0, quotes: 0, total: 0 };
    current.quotes += 1;
    history.set(quote.customer_id, current);
  }
  const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
  return customersResult.data.map((customer) => {
    const summary = toCustomerSummary(customer);
    const customerHistory = history.get(customer.id);
    return customerHistory ? { ...summary, orders: customerHistory.orders, quotes: customerHistory.quotes, total: euro.format(customerHistory.total) } : summary;
  });
}
