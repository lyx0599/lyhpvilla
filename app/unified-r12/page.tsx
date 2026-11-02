import {Suspense} from 'react';
import {UnifiedR12Review} from '@/components/unified-r12-review';
export const metadata={title:'整合方案实景 · 林屿湖畔'};
export default function Page(){return <Suspense fallback={<main>正在加载实际统一模型…</main>}><UnifiedR12Review/></Suspense>;}
