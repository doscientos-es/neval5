import { NevalApp } from "@/components/neval-app";
import { listCustomerSummaries } from "@/features/customers/customer-repository";
import { getDashboardData } from "@/features/dashboard/dashboard-repository";
import { getCatalogData } from "@/features/catalog/catalog-repository";
import { getCommercialData } from "@/features/commercial/commercial-repository";
import { getInventoryData } from "@/features/inventory/inventory-repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [customers, dashboard, catalog, commercial, inventory] = await Promise.all([listCustomerSummaries(), getDashboardData(), getCatalogData(), getCommercialData(), getInventoryData()]);
  return <NevalApp initialCustomers={customers ?? []} dashboard={dashboard} catalog={catalog} commercial={commercial} inventory={inventory} />;
}
