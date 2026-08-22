import { Suspense } from "react";
import { B2Preview } from "@/components/b2-preview";

export const metadata = {
  title: "B2 实时预览 · 林屿湖畔",
  description: "B2 两根柱子与家具布置的 3D 预览"
};

export default function B2PreviewPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#e9e2d7] text-stone-700">正在准备 B2 实时预览…</main>}>
      <B2Preview />
    </Suspense>
  );
}
