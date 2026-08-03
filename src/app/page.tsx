import { NevalApp } from "@/components/neval-app";
import { listCustomerSummaries } from "@/features/customers/customer-repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const customers = await listCustomerSummaries();
  return <NevalApp initialCustomers={customers ?? undefined} />;
}
