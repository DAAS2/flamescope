import Dashboard from "@/components/Dashboard";
import { getInvestigations } from "@/lib/data";

export const revalidate = 300;

export default async function Home() {
  const { data, source } = await getInvestigations();
  return <Dashboard investigations={data} source={source} />;
}
