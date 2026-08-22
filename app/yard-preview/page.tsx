import { Suspense } from "react";
import { YardPreview } from "@/components/yard-preview";

export const metadata = {
  title: "院子实时预览 · 林屿湖畔",
  description: "林屿湖畔南院与北院统一庭院 2D 总览、3D 总览及固定机位"
};

export default function YardPreviewPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#e9e2d7] text-stone-700">正在准备院子实时预览…</main>}>
      <YardPreview />
    </Suspense>
  );
}
