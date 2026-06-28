import { SpacePlanner } from "@/components/space-planner";
import { mockSpaceData } from "@/data/mock-space";

export default function Home() {
  return <SpacePlanner data={mockSpaceData} />;
}
