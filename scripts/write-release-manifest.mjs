import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bytes=fs.readFileSync(path.join(root,'data/default-workspace.json')),model=JSON.parse(bytes);
const commit=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const workingTreeDirty=execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:root,encoding:'utf8'}).trim().length>0;
const manifest={sourceCommit:commit,workingTreeDirty,modelRevision:model.defaultWorkspaceRevision,modelSha256:crypto.createHash('sha256').update(bytes).digest('hex'),generatedAt:new Date().toISOString(),floors:Object.fromEntries(['B2','B1','1F','2F','YARD'].map(id=>[id,{walls:model.houseStructuresByFloor[id].walls.length,furniture:model.furniture.filter(f=>f.floorId===id).length}])),scope:'Reviewed regional fields; approved B1 original-arc/full-width design; PMO-adopted 1F C2 table/chair and optionB entry-chest design with separate action states, pending finished-product detailing; PMO-adopted C03A north-yard cold-layout design with linked planting/work-paving proposal and four interface render adapters; phone/release identity fixes. Not whole-house use, comfort or construction acceptance.',openItems:['B1 slab thickness, bearing and field elevations unconfirmed; retained original arc/end-detail requires construction coordination','1F adopted C2/entryB is a design model: L2 facing72.61deg/legroom, basket handle485.4mm planar distance and546–564mm model height, entry37.9mm nominal/frame/hardware pending; one-person phased use, not arbitrary simultaneous actions, finished PBR or fabrication approval','Original 1F bedroom entry and whole-floor complete-use HOLD remains open','2F bath/adjacent boundary research isolated; no expansion adopted; preserve tub, double basin, separate shower, toilet and both dressing functions','B2 approved text fields only; research layout and rendering contract not adopted','C03A cold layout adopted only as initial design; C03B east hot-use pose excluded; tap170/120, basin35/45, service664x600, actual roof/hanging load, MEP, capacities and materials pending; boundary/skylight/fence context is not field or aesthetic approval','Building elevations are model constants, not field finished heights']};
manifest.scope+=' PMO-adopted B2 R7 north100inchTV, new2600x1080x850 four-seat leather reference, explicit4/6 wooden dining chairs, two-glass castle/sports roles and same existing bike+independent trainer alternative states; clean default preview with diagnostic evidence opt-in.';
manifest.openItems=manifest.openItems.map(item=>item.startsWith('B2 approved text fields only')?'B2 R7 design adopted, not product purchase/fabric confirmation/4-adult comfort:1150/Y3500 eyes are assumptions; source tolerance exceeds micro-clearances; real multi-person sit/rise/stair use, supports, loaded bike U/S motion/operator/cables, heat/MEP/field verification pending; source lowdoor/aperture and600 grayBox intent not construction approval; historical linked MEP points not relocated':item);
fs.mkdirSync(path.join(root,'public'),{recursive:true});
manifest.scope+=' Independent review ecc680 permits only the master-toilet west-back/east-front rotation and +160mm X center migration; not whole-bath acceptance. Balcony connection door remains an isolated unadopted candidate.';
manifest.openItems.push('Master bath: tub/vanity overlap58950mm2,1700tub vs1594 nominal inside width, other fixture wall intrusions and554mm frontal gap remain. No expansion, product installation or whole-bath use approval.');
if(model.defaultWorkspaceRevision.includes('four-items-mechanical')){
 manifest.scope+=' R10-M1 local partial integration only: approved1350 daily round/2298 long table meshes and coaxial pedestal; reviewed11991a2e three-leaf closets/24 explicit functional modules, hollow drawers and cabinet-relative scheme strips. Not the completed four-item release.';
 manifest.openItems.push('Four-item release incomplete: reasonable table/chair layout, final closet placement/main operations, actual R14 entity and shared two-floor/bath correction pending. Preserve R09 B2; no new B2 research adopted.');
}
if(model.defaultWorkspaceRevision.includes('r14-r08-integrated')){
 manifest.scope='R10-M2 isolated unpublished integration on accepted M1: actual1350 round/2298 long table bodies, three ordinary leaves per closet and24 functional modules retained; newly integrated reviewed R08 R14 all113 native parts with relieved arc shelves, owner-contract gating and portable anchors; D005-only room-aware outward72deg door, full-size relocated floor lamp and officially generated L34 binding. Wall axes, other furniture positions and accepted R09 B2 preserved. Independent R08 local operations acceptance is not whole-floor acceptance of this different furniture layout. NOT four-item complete, NOT publication approval.';
 manifest.openItems=[
  'Actual shared1F/2F R11 wall axes, openings, room boundaries and dependent objects still require integrated same-state verification and PMO adoption; east878/south400 alternatives not adopted.',
  'Final daily eight-seat placement and sofa west100 remain candidate-only; current M2 retains M1 chairs/sofa. Party10+2 not passed.',
  'R11-C1 closet complete cycles locally passed but not yet physically bound to a reviewed shared-floor model here; do not reopen their resolved local chain issue.',
  'R08 D005/arc/L34 source return items locally resolved; verify native integration without claiming source route certificate transfers to changed tables or future walls.',
  'B1 selected2250 follow-up not integrated in this R14 increment; original R09 B1 retained.',
  'No new E2 privacy/visibility or full raycast certification in this R14 increment; historical confirmed results not silently recomputed.',
  'Design inferred dimensions/materials, not measured engineering, product procurement or construction certification; no new B2 research.'
 ];
}
if(model.defaultWorkspaceRevision.includes('b1-selected2250-staged')){
 manifest.scope='M3a isolated unpublished staging on acceptedM2 d9631e6. All M2 table/closet/nativeR14(113 parts)/D005/lamp/L34 fields preserved. Only user-selectedB1 right tail2250 and associated room floor/right/bottom research railing fields guarded-applied. Original arc/main body retained; normal rendered native floor/rails inspected. Not four-item complete, not main merged, not public release.';
 manifest.openItems=['Final1F eight-seat reasonable arrangement and actual shared1F2F/R11 still require same-state integration, original review and PMO choices; do not inherit R08 routes.','SeparateR11 comparison internal220/entry1400/east878 not adopted or copied here. NewB2 excluded.','B1 native application floor/right boundary evidence is an increment to selected2250, not40mm endcap or slab thickness/bearing/real edge-height certification. Native rail1070 vs metadata1100 retained expression; max handrail8937.8 vs centerline floor8900 disclosed.','No new E2 privacy/six-point or full raycast pass; historical source calculations retained, not recertified.'];
}
if(model.defaultWorkspaceRevision.includes('source-ratio-A-integrated')){
 manifest.scope='R12 single-source four-item integration candidate: accepted M2 native R14 all113 parts,1350 round/2298 long table and3 ordinary closet leaves per side; accepted B1 selected2250; user-adopted internal A north220/entry1400 and source-ratio correction. Actual wall/room/aperture/furniture bindings, native views and affected-interface checks are versioned together. Source ratios are design inference, not field measured structural permission. Original local certificates do not silently transfer to new global geometry.';
 manifest.integrationStatus='candidate-awaiting-affected-increment-review';
 manifest.openItems=[
  'Recommended east-axis9870 is an explicit working choice within low-resolution source read tolerance; neutral source fit9497 differs. No unique inferred millimeter or site expansion approval.',
  'Fixed eight-seat circulation and affected doors need the original1F final minimum delta; party10+2 is not passed.',
  'D-2F-001 unsupported generic hypothesis reversibly withdrawn; guest vanity shifted13, D006 west94 with room-aware north inward mapping and new normal900 double-slide shower bound to actual root. Affected interfaces and guest3086-state/3085-segment entry-close-exit cycle are conditionally accepted at unchanged geometry, author lower8.6mm retained; not comfort, field-floor or construction approval.',
  'Historical E2/privacy/six-point/533/775 source calculations remain historical, not new geometry recertification.',
  'Closet local immutable1192-state cycles are separate-side; new global static binding checked separately, not simultaneous both-side opening or all-room certification.',
  'B1 slab/bearing/field levels and native1070-vs-nominal1100 rail expression remain disclosed, not construction approval.',
  'Existing B2 and yard design retained exactly; no new B2 research. Products, MEP and on-site dimensions remain separately unconfirmed.'
 ];
}
if(/r12-work0[67]$/.test(model.defaultWorkspaceRevision)){
 const currentStage=model.defaultWorkspaceRevision.endsWith('work07')?'W07':'W06',chairSouthMm=currentStage==='W07'?118:125,edgeReserveMm=currentStage==='W07'?5:6;
 manifest.integrationStatus='one-f-minimum-increment-awaiting-original-review';
 manifest.scope+=` ${currentStage} actual fixed8 candidate uses existing C11 six round/two long chairs, only L1 south${chairSouthMm} within that layout; preserves all real sizes and current other-floor geometry. Accepted WC minimum host correction applied with original D005 retained and generated-draft owner links refreshed. No failed west125 opening adopted.`;
 manifest.openItems=manifest.openItems.map(s=>s.startsWith('Fixed eight-seat circulation')?`${currentStage} actual fixed8 routes/actions and affected R14 integration are under original incremental review. Constructed600x1800 paths with${edgeReserveMm}mm extra edge reserve are nominal tight model geometry, not comfortable or arbitrary simultaneous whole-house use; party10+2 unpassed.`:s);
 manifest.openItems.push('Long-table end seats face a solid panel leg. Native chair-front-to-leg152.5mm, chair-front-to-edge30mm and seat-to-underside210mm are geometry only; seated knee/leg room remains a product/detailing risk. No leg removed/recessed and no comfort claim. Eight-seat target not silently reduced.');
 manifest.openItems.push('R14 normal use is phased: base/upper doors are opened at a clear opening station, fetch/return while open, close before public departure. Changed coat operator station8550/4380 replaces a failed old station; no furniture moved for that adjustment. Not13 articulated human cycles or all doors/baskets simultaneously.');
}
if(model.defaultWorkspaceRevision.endsWith('r12-published-work07')){
 manifest.scope='PMO-adopted four-item design integration: fixed daily6+2 actual full-size chairs and1350/2298 tables; native113-part R14 and normal phased use; dual three-leaf closets with retained separate-side cycles; common source-ratio floor coordination, internal A and selectedB1 original-arc2250. Existing adoptedB2 R7 and yardC03A retained without newB2 research. Public daily geometry/actions are exactly W07; only revision, corrected table notes and removed unadopted party-coordinate metadata differ. Design model, not comfort, whole-house arbitrary simultaneous operation or construction approval.';
 manifest.integrationStatus='reviewed-and-pmo-adopted-design-release';
 manifest.reviewedModelSha256='1d4074a7654ab558ae0ef1afb5abb74c7fa4e707cf1170929464d9cc32bb991b';
 manifest.publicProjection='Daily8 geometry and declared trajectories unchanged;1750/10 goal retained, unreviewed party rendering disabled.';
 manifest.openItems=[
  'Source-ratio walls/rooms/apertures are inferred design dimensions, pending field measurement. East9870 is an explicit working choice within source tolerance, not uniquely measured or structural expansion permission.',
  'Daily8 limited600x1800 proxy routes use5mm extra edge reserve and about612mm nominal bottleneck: tight, not adult comfort, tolerance or gait certification. Public routes hold D005 at72deg and D004 at0.8; R14 normal phased operations hold D005 closed0deg. Different states are not simultaneous.',
  'Long-table real solid panel legs retained: chair front to leg152.5mm, to tabletop edge30mm, seat to underside210mm. Knee/thigh space, comfortable long sitting and finished product detail remain unresolved. Eight-seat target retained;1750 extension/party10 unreviewed and not rendered.',
  'WC original D005 position retained, vanity/toilet minimal correction bound to accepted local cycle lower3.374724059mm; this is not a universal5mm WC pass or comfortable installation. Draft owner-light links are not field MEP relocation.',
  'R14 normal use is phased: approach clear opening station, open, fetch/return while open, return opening station, close, depart. Coat operator8550/4380. Not arbitrary simultaneous doors/baskets or13 articulated-human cycles.',
  '2F guest bath3086 states/3085 segments and floor binding remain conditionally accepted at unchanged geometry; author lower8.6mm retained. Closets1192 states are separate-side cycles with current static global binding, not simultaneous both sides.',
  'B1 original arc retained with selected2250 tail. Native rail1070 versus nominal1100 expression and outer edge offsets remain; slab thickness, bearing, elevations and end detailing unconfirmed.',
  'Historical E2/privacy/six-point/533/775 calculations are not recertified for new geometry; virtual diagnostic cameras do not establish physically accessible observation points.',
  'Existing B2 R7 and yard C03A are prior adopted design only. No new B2 research; product procurement, load-bearing, heat, utilities, field dimensions and multi-person comfort remain unconfirmed.'
 ];
}
if(/r15-r16-candidate-r0[12]$/.test(model.defaultWorkspaceRevision)){
 manifest.integrationStatus='local-candidate-awaiting-original-increment-review-and-pmo-second-look';
 manifest.scope='Unpublished guarded R15/R16 cabinet integration on published R12 W07 /873d: three1F furniture owners and three draft drawing items; two2F closet owners, exact126-part/14-operation R15 geometry and R16 eight-leaf renderer/contract/new cycles. Walls, apertures, tables/chairs, retained24 wardrobe modules and all unrelated model fields are unchanged. Local evidence is integration binding, not a new inherited collision certificate or publication approval.';
 manifest.openItems=[
  'Original affected-increment review and PMO second look of this exact combined model are pending. Do not publish or claim integration accepted merely because independent source candidates passed.',
  'R15 normal use is phased with D005 closed: approach opening station, open, fetch/return, return station, close, depart. Source conservative D005 lower10.0315mm, fixed assembly contacts and decorative coffee-machine/cup simplifications retained; no finished appliance, robot, load or construction certification.',
  'R16 eight leaves and drawers use new ten600x1700 rigid-body cycles; opposite side closed; drawer forces leaves2+3 open90 and single-door mode resets travel. Independent conservative minimum2.5mm; four release/regrasp boundaries are not full articulated-arm trajectories or comfort/site approval.',
  'Door and drawer research bottoms raised14mm with actual floor retained; cabinet outer dimensions,24 modules and850high pedestal retained. Half-mirror optics, hinges, frame engineering and field tolerances remain unresolved.',
  'R02 applies separately guarded annotation-only alignment to190mm/2000mm/new3950 split; all geometry, lights, contracts and cycles are unchanged. Legacy R14/drybar-2400 stable compatibility identifiers are not old physical dimensions or inherited certificates.',
  'Existing inferred walls/rooms, fixed daily8 tight routes, table knee space, bath, B1 rail/elevations and historical E2/privacy/six-point/533/775 limitations remain. No new B2 or staircase storage candidate is included.'
 ];
}
if(model.defaultWorkspaceRevision.endsWith('r15-r16-published-r01')){
 manifest.scope='PMO-adopted R15/R16 cabinet entity design increment on published R12 W07: three1F furniture owners and three draft items, two2F closet owners with necessary native renderer/proxy/geometry/contract/new-cycle dependencies. R15 is126 parts/14 operations,3950 split600+650+200+500+2000 and190mm bottom clearance. R16 is eight real leaves with24 retained modules and850 pedestal. All unrelated model fields and geometry are unchanged. Not comfort, product procurement, full articulated-human use or construction certification.';
 manifest.integrationStatus='reviewed-and-pmo-adopted-design-release';
 manifest.reviewedModelSha256='f8f9c87538c5e9974e77b3825313c8c8eba353945143dd29a029719ccb8a9578';
 manifest.independentCombinedReportSha256='6d7d5c55c111c556e98d3516396297ea1e80f0d6cdb3ea24ed43cc9a82830eab';
 manifest.publicProjection='model-releases/2026-11-08-r15-r16.json';
 manifest.wallDisplayComparison={scope:'2F full-wall main entry versus local cutaway, not the same comparison as source-plan captures',wallMeshesWithDisplayDifferences:188,capMaterialNamesDiffer:44,geometryMatricesBoundingBoxesAndCabinetGlassEqual:true};
 manifest.openItems=[
  'R15 normal phased use only: approach opening station, open, fetch/return while open, return opening station, close, depart. D005 closed during cabinet use; source conservative lower10.0315mm and narrow5mm body edge reserves retained, not old40mm or comfortable simultaneous use.',
  'R15 seven fixed assembly contacts and two decorative coffee-machine/cup simplification overlaps retained; no all-self-zero or detailed appliance/cup operation approval. Robot350 diameter100/180 high is a rigid proxy;180 high has about10mm vertical reserve under lowest hardware. No real robot, recharge, anchors or bearing certification.',
  'R16 separate-side600x1700 rigid-body cycles with opposite side closed; drawer350 forces leaves2+3 open90; selecting single door resets drawer. Independent conservative minimum2.5mm, not author10.54mm independently reproduced or comfort/site tolerance approval. Four release/regrasp boundaries lack complete articulated-arm trajectories.',
  'R16 door/drawer research bottoms raised14 with actual floor retained; outer2240x600x2470 dimensions,24 modules and850-high pedestal unchanged. Tall doors,12x18 front frame, hinges/anchors, half-mirror optics, real door gaps and field tolerances remain unresolved.',
  '188 wall meshes have display-field differences between main full-wall and local cutaway views, including44 cap material names. Geometry/matrices/bounds and cabinet glass match. Two source plan references instead have only W-2F-008 cap display difference. Clipping is not deletion or collision proof.',
  'Source-ratio walls/rooms/apertures and east9870 remain design inference pending field measurement; internal A north220/entry1400 retained, not structural expansion permission.',
  'Fixed daily6+2 full-size chairs and1350/2298 tables retained. About612mm nominal bottleneck with5mm extra edge reserve is tight; solid panel leg knee/thigh and long sitting comfort unresolved.1750 extension/party10 target remains unreviewed and unrendered.',
  'Existing guest-bath/main-bath affected conditional acceptance retained at unchanged geometry; not a new whole-bath, field-floor, fixture product or comfortable installation certificate. Draft lamp/control links are not field MEP relocation.',
  'B1 original arc and2250 tail retained; native1070 versus nominal1100 rail expression, outer edge offsets, slab/bearing and field elevations remain unresolved.',
  'Historical E2/privacy/six-point/533/775 source calculations are preserved, not recertified for new geometry; virtual diagnostic cameras are not proof of physically accessible observation points.',
  'Existing B2 R7 and yard C03A prior adopted design retained. No new B2 south-cabinet/island or stair-storage research is included. Product/load/heat/utilities/field dimensions and multi-person comfort remain unconfirmed.'
 ];
}
const b1RenderRecord=path.join(root,'public/render-releases/2026-11-08-b1-r03.json');
const calibrationRecord=path.join(root,'public/model-releases/2026-11-11-four-floor-candidate.json');
const calibrationBinding=fs.existsSync(calibrationRecord)?JSON.parse(fs.readFileSync(calibrationRecord,'utf8')):null;
if(calibrationBinding){
 if(!model.defaultWorkspaceRevision.includes('four-floor')||calibrationBinding.modelSha256!==manifest.modelSha256)throw new Error('Four-floor candidate model identity mismatch');
 for(const file of calibrationBinding.sourceFiles){const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file.path))).digest('hex');if(actual!==file.sha256)throw new Error('Four-floor candidate code identity mismatch: '+file.path);}
}
if(fs.existsSync(b1RenderRecord)){
 const binding=JSON.parse(fs.readFileSync(b1RenderRecord,'utf8'));
 if(binding.sourceModelSha256!==manifest.modelSha256&&!calibrationBinding)throw new Error('B1 renderer is not bound to the declared unchanged model');
 const integrationPath=path.join(root,'public/model-releases/2026-11-11-b1-renderer-integration.json');
 const integration=calibrationBinding&&fs.existsSync(integrationPath)?JSON.parse(fs.readFileSync(integrationPath,'utf8')):null;
 if(integration&&integration.modelSha256!==manifest.modelSha256)throw new Error('Current B1 runtime integration model binding mismatch');
 for(const file of binding.files){
  const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file.path))).digest('hex');
  if(actual===file.afterSha256)continue;
  const changed=integration?.changedFiles?.find(entry=>entry.path===file.path);
  if(!['components/floor-3d-view.tsx','components/design-evidence-audit.tsx'].includes(file.path)||!changed||changed.beforeSha256!==file.afterSha256||changed.afterSha256!==actual)throw new Error('B1 renderer file hash mismatch without explicit current rebase: '+file.path);
 }
 if(integration)manifest.currentB1RuntimeIntegration={...integration,record:'model-releases/2026-11-11-b1-renderer-integration.json'};
 manifest.renderRevision=binding.revision;manifest.renderIdentitySha256=binding.renderIdentitySha256;manifest.b1BoundaryIncrement={phase:binding.phase,sourceModelJSONUnchanged:true,sourcePublicCommit:binding.sourcePublicCommit,reviewedIntegrationCommit:binding.reviewedIntegrationCommit,sourceReportSha256:binding.independentSourceReportSha256,integrationBindingReportSha256:binding.independentIntegrationBindingReportSha256,localMainEntryReportSha256:binding.independentLocalMainEntryReportSha256,scope:binding.pmoAdoptedScope};
 manifest.scope=manifest.scope.replace('All unrelated model fields and geometry are unchanged.','The prior R15/R16 model JSON projection remains unchanged; the separately identified B1 renderer increment below changes native boundary meshes.');
 manifest.scope+=' B1 render-only boundary increment: source220 wall caps/shadows/baseboards flush to source axes; original-section continuous rail miters and5duplicate endpoint posts removed. Original arc/2250/Y7800, all source model data and existing materials/lighting retained. This is separate from the unadopted basement whole-plan.';
 manifest.openItems.push(...binding.retainedLimits);
}
if(calibrationBinding){
 manifest.integrationStatus='UNREVIEWED_LOCAL_FOUR_FLOOR_ARCHITECTURE_CANDIDATE_NOT_PUBLIC_RELEASE';
 manifest.scope=calibrationBinding.scope;
 manifest.renderRevision=calibrationBinding.renderRevision;manifest.renderIdentitySha256=calibrationBinding.renderIdentitySha256;
 manifest.candidateBindingRecord='model-releases/2026-11-11-four-floor-candidate.json';manifest.basePublicCommit=calibrationBinding.basePublicCommit;
 manifest.b1BoundaryIncrement={...manifest.b1BoundaryIncrement,basis:'Historical renderer-source review ONLY; not current changed-world spatial acceptance',currentGeometryReview:'pending'};
 manifest.openItems=calibrationBinding.openItems;
 if(calibrationBinding.phase==='PMO_ADOPTED_5900_DESIGN_RELEASE'){
  manifest.integrationStatus='reviewed-and-pmo-adopted-5900-inferred-design-release';
  manifest.reviewScopesRecord=calibrationBinding.reviewScopesRecord;manifest.finalCombinationReport=calibrationBinding.finalCombinationReport;manifest.pmoFinalAdoptionSha256=calibrationBinding.pmoFinalAdoptionSha256;
  manifest.b1BoundaryIncrement={...manifest.b1BoundaryIncrement,sourceModelJSONUnchanged:false,basis:'Historical B1 renderer record is provenance; current changed-world limited design acceptance is bound to the5900 final combination and originalsecond-line reports.',currentGeometryReview:'independently-conditionally-accepted-with-retained-design-limits'};
 }
}
fs.writeFileSync(path.join(root,'public/release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Release identity: ${commit} / ${manifest.modelSha256}`);
