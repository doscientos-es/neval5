import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DashboardOrder = {
  number: string;
  customer: string;
  status: string;
  total: string;
  createdAt: string;
};

export type DashboardData = {
  userName: string;
  pendingOrders: number;
  readyOrders: number;
  deliveredOrders: number;
  orderValue: string;
  lowStock: number;
  quoteConversion: string;
  pendingPurchases: number;
  purchaseValue: string;
  salesByRep: { name: string; total: string; orders: number }[];
  recentOrders: DashboardOrder[];
  alerts: { name: string; stock: string; minimum: string }[];
};

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileResult, ordersResult, productsResult, movementsResult, quotesResult, purchasesResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("orders").select("number, status, total, created_at, customer_name_snapshot, sales_rep_id, profiles!orders_sales_rep_id_fkey(full_name)").order("created_at", { ascending: false }),
    supabase.from("products").select("id, name, stock_unit, minimum_stock").eq("track_stock", true).is("archived_at", null),
    supabase.from("stock_movements").select("product_id, quantity"),
    supabase.from("quotes").select("status"),
    supabase.from("purchase_orders").select("status, total"),
  ]);

  if (ordersResult.error || productsResult.error || movementsResult.error || quotesResult.error || purchasesResult.error) {
    throw new Error("No se ha podido cargar el panel de control.");
  }

  const stockByProduct = new Map<string, number>();
  for (const movement of movementsResult.data) {
    stockByProduct.set(movement.product_id, (stockByProduct.get(movement.product_id) ?? 0) + Number(movement.quantity));
  }

  const alerts = productsResult.data
    .map((product) => {
      const stock = stockByProduct.get(product.id) ?? 0;
      return { name: product.name, stock, minimum: Number(product.minimum_stock), unit: product.stock_unit };
    })
    .filter((product) => product.stock < product.minimum)
    .sort((a, b) => (a.stock / Math.max(a.minimum, 1)) - (b.stock / Math.max(b.minimum, 1)))
    .slice(0, 5)
    .map((product) => ({ name: product.name, stock: `${product.stock} ${product.unit}`, minimum: `${product.minimum} ${product.unit}` }));

  const orders = ordersResult.data;
  const salesByRep = new Map<string, { name: string; total: number; orders: number }>();
  for (const order of orders) {
    if (!order.sales_rep_id) continue;
    const profile = (Array.isArray(order.profiles) ? order.profiles[0] : order.profiles) as { full_name: string } | null;
    const current = salesByRep.get(order.sales_rep_id) ?? { name: profile?.full_name || "Comercial", total: 0, orders: 0 };
    current.total += Number(order.total);
    current.orders += 1;
    salesByRep.set(order.sales_rep_id, current);
  }
  return {
    userName: profileResult.data?.full_name || user.email?.split("@")[0] || "Usuario",
    pendingOrders: orders.filter((order) => order.status === "pending").length,
    readyOrders: orders.filter((order) => order.status === "ready").length,
    deliveredOrders: orders.filter((order) => order.status === "delivered").length,
    orderValue: euro.format(orders.reduce((sum, order) => sum + Number(order.total), 0)),
    lowStock: alerts.length,
    quoteConversion: quotesResult.data.length ? `${Math.round((quotesResult.data.filter((quote) => quote.status === "converted").length / quotesResult.data.length) * 100)} %` : "—",
    pendingPurchases: purchasesResult.data.filter((purchase) => !["received", "cancelled"].includes(purchase.status)).length,
    purchaseValue: euro.format(purchasesResult.data.filter((purchase) => purchase.status !== "cancelled").reduce((sum, purchase) => sum + Number(purchase.total), 0)),
    salesByRep: [...salesByRep.values()].sort((a, b) => b.total - a.total).map((sales) => ({ name: sales.name, total: euro.format(sales.total), orders: sales.orders })),
    recentOrders: orders.slice(0, 6).map((order) => ({
      number: order.number,
      customer: order.customer_name_snapshot,
      status: order.status,
      total: euro.format(Number(order.total)),
      createdAt: new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(order.created_at)),
    })),
    alerts,
  };
}
