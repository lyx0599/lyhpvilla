import { SpacePlanner } from "@/components/space-planner";
import { defaultSpaceData } from "@/data/mock-space";

export default function Home() {
  return <SpacePlanner data={defaultSpaceData} />;
}
