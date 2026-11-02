import {Suspense} from 'react';
import {UnifiedR12Review} from '@/components/unified-r12-review';
export const metadata={title:'按图比例统一候选 R12 · 林屿湖畔'};
export default function Page(){return <Suspense fallback={<main>正在加载实际统一模型…</main>}><UnifiedR12Review/></Suspense>;}
