import { Suspense } from "react";
import { B1Preview } from "@/components/b1-preview";

export const metadata = {
  title: "B1 十机位预览 · 林屿湖畔",
  description: "B1 严格户型固定机位与写实渲染基准预览"
};

export default function B1PreviewPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#e9e2d7] text-stone-700">正在准备 B1 实时预览…</main>}>
      <B1Preview />
    </Suspense>
  );
}
