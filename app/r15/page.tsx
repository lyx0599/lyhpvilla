import{Suspense}from'react';import{R15Preview}from'@/components/r15-preview';
export const metadata={title:'1F R15本地集成候选｜待复核'};
export default function Page(){return <Suspense fallback={<main>加载R15真实实体…</main>}><R15Preview/></Suspense>;}
