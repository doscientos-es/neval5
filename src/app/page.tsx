import { NevalApp } from "@/components/neval-app";
import { listCustomerSummaries } from "@/features/customers/customer-repository";
import { getDashboardData } from "@/features/dashboard/dashboard-repository";
import { getCatalogData } from "@/features/catalog/catalog-repository";
import { getCommercialData } from "@/features/commercial/commercial-repository";
import { getInventoryData } from "@/features/inventory/inventory-repository";
import { getConfigurationData } from "@/features/configuration/configuration-repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [customers, dashboard, catalog, commercial, inventory, configuration] = await Promise.all([listCustomerSummaries(), getDashboardData(), getCatalogData(), getCommercialData(), getInventoryData(), getConfigurationData()]);
  return <NevalApp initialCustomers={customers ?? []} dashboard={dashboard} catalog={catalog} commercial={commercial} inventory={inventory} configuration={configuration} />;
}
