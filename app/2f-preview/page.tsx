import { Suspense } from "react";
import { SecondFloorPreview } from "@/components/second-floor-preview";

export const metadata = {
  title: "2F 十机位预览 · 林屿湖畔",
  description: "2F 新增十个室内设计机位的 3D 预览"
};

export default function SecondFloorPreviewPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#e9e2d7] text-stone-700">正在准备 2F 实时预览…</main>}>
      <SecondFloorPreview />
    </Suspense>
  );
}
