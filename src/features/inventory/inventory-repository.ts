import { createServerSupabaseClient } from "@/lib/supabase/server";

export type InventoryData = {
  suppliers: { id: string; name: string; contactName: string; phone: string; email: string }[];
  purchases: { id: string; number: string; supplier: string; status: string; total: string }[];
  stock: { id: string; code: string; name: string; unit: string; minimum: number; available: number }[];
};

export async function getInventoryData(): Promise<InventoryData | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [suppliersResult, purchasesResult, productsResult, movementsResult] = await Promise.all([
    supabase.from("suppliers").select("id, name, contact_name, phone, email").is("archived_at", null).order("name"),
    supabase.from("purchase_orders").select("id, number, status, total, suppliers(name)").order("created_at", { ascending: false }),
    supabase.from("products").select("id, code, name, stock_unit, minimum_stock").eq("track_stock", true).is("archived_at", null).order("name"),
    supabase.from("stock_movements").select("product_id, quantity"),
  ]);
  if (suppliersResult.error || purchasesResult.error || productsResult.error || movementsResult.error) throw new Error("No se ha podido cargar compras y almacén.");
  const balances = new Map<string, number>();
  movementsResult.data.forEach((movement) => balances.set(movement.product_id, (balances.get(movement.product_id) ?? 0) + Number(movement.quantity)));
  return {
    suppliers: suppliersResult.data.map((supplier) => ({ id: supplier.id, name: supplier.name, contactName: supplier.contact_name || "", phone: supplier.phone || "", email: supplier.email || "" })),
    purchases: purchasesResult.data.map((purchase) => ({ id: purchase.id, number: purchase.number, status: purchase.status, total: Number(purchase.total).toFixed(2), supplier: purchase.suppliers?.[0]?.name || "Proveedor" })),
    stock: productsResult.data.map((product) => ({ id: product.id, code: product.code, name: product.name, unit: product.stock_unit, minimum: Number(product.minimum_stock), available: balances.get(product.id) ?? 0 })),
  };
}
