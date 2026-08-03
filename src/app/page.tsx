import { NevalApp } from "@/components/neval-app";
import { listCustomerSummaries } from "@/features/customers/customer-repository";
import { getDashboardData } from "@/features/dashboard/dashboard-repository";
import { getCatalogData } from "@/features/catalog/catalog-repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [customers, dashboard, catalog] = await Promise.all([listCustomerSummaries(), getDashboardData(), getCatalogData()]);
  return <NevalApp initialCustomers={customers ?? []} dashboard={dashboard} catalog={catalog} />;
}
