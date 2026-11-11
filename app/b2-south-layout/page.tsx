import {Suspense} from 'react';
import {B2WestLayoutPreview} from '@/components/b2-west-layout-preview';
export const metadata={title:'B2四人方案·有限动作研究'};
export default function Page(){return <Suspense fallback={<main>加载B2四人动作视图…</main>}><B2WestLayoutPreview/></Suspense>;}
