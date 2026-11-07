import {Suspense} from 'react';
import {R16CloakCandidate} from '@/components/r16-cloak-candidate';
export const metadata={title:'2F衣帽间八门实体候选｜未合主模型'};
export default function Page(){return <Suspense fallback={<main>加载独立实体候选…</main>}><R16CloakCandidate/></Suspense>}
