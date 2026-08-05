import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CatalogProduct = {
  id: string;
  code: string;
  name: string;
  description: string;
  basePrice: string;
  trackStock: boolean;
  stockUnit: string;
  minimumStock: string;
  familyId: string | null;
  taxRateId: string | null;
  familyName: string;
  taxName: string;
};

export type CatalogData = {
  products: CatalogProduct[];
  families: { id: string; name: string }[];
  taxes: { id: string; name: string; rate: string; isDefault: boolean }[];
  priceLists: { id: string; name: string; itemCount: number }[];
};

export async function getCatalogData(): Promise<CatalogData | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [productsResult, familiesResult, taxesResult, priceListsResult] = await Promise.all([
    supabase.from("products").select("id, code, name, description, base_price, track_stock, stock_unit, minimum_stock, family_id, default_tax_rate_id, product_families(name), tax_rates(name)").is("archived_at", null).order("name"),
    supabase.from("product_families").select("id, name").is("archived_at", null).order("name"),
    supabase.from("tax_rates").select("id, name, rate, is_default").order("rate"),
    supabase.from("price_lists").select("id, name, price_list_items(count)").is("archived_at", null).order("name"),
  ]);
  if (productsResult.error || familiesResult.error || taxesResult.error || priceListsResult.error) throw new Error("No se ha podido cargar el catálogo.");

  return {
    products: productsResult.data.map((product) => ({
      id: product.id, code: product.code, name: product.name, description: product.description || "",
      basePrice: Number(product.base_price).toFixed(2), trackStock: product.track_stock,
      stockUnit: product.stock_unit, minimumStock: String(product.minimum_stock),
      familyId: product.family_id, taxRateId: product.default_tax_rate_id,
      familyName: product.product_families?.name || "Sin familia", taxName: product.tax_rates?.name || "Sin IVA",
    })),
    families: familiesResult.data,
    taxes: taxesResult.data.map((tax) => ({ id: tax.id, name: tax.name, rate: String(tax.rate), isDefault: tax.is_default })),
    priceLists: priceListsResult.data.map((list) => ({ id: list.id, name: list.name, itemCount: list.price_list_items?.[0]?.count ?? 0 })),
  };
}
