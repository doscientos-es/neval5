import { NevalApp } from "@/components/neval-app";
import { listCustomerSummaries } from "@/features/customers/customer-repository";
import { getDashboardData } from "@/features/dashboard/dashboard-repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [customers, dashboard] = await Promise.all([listCustomerSummaries(), getDashboardData()]);
  return <NevalApp initialCustomers={customers ?? []} dashboard={dashboard} />;
}
