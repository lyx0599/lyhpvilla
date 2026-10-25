import { Suspense } from "react";
import { ModelPreview } from "@/components/model-preview";

export const metadata = {
  title: "全屋实时模型 · 林屿湖畔",
  description: "五个区域共用的实时三维模型，查看家具材质、空间关系和固定机位。"
};

export default function ModelPreviewPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#eee9e0] text-stone-700">正在准备全屋实时模型…</main>}><ModelPreview /></Suspense>;
}
