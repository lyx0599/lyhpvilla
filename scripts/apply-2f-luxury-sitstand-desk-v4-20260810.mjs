import fs from 'node:fs';

const dataUrl = new URL('../data/default-workspace.json', import.meta.url);
const workspace = JSON.parse(fs.readFileSync(dataUrl, 'utf8'));
const desk = workspace.furniture.find((item) => item.id === 'module-2f-window-desk');
if (!desk) throw new Error('Missing module-2f-window-desk');

desk.name = '衣帽间1.8m×0.7m高定电动升降桌';
desk.dimensions = { width: 180, depth: 70, height: 74, unit: 'cm' };
desk.variant = 'luxuryElectricBladePedestal';
desk.heightRangeMm = [650, 1250];
desk.currentHeightMm = 740;
desk.material = '40mm烟熏胡桃木大板 + 香槟古铜双升降刀片柱';
desk.visual = {
  top: '40mm-smoked-walnut-bookmatched-chamfered',
  liftBase: 'two-wide-champagne-bronze-telescopic-blade-pedestals',
  baseCount: 2,
  motorHousing: 'recessed-rear-bronze-beam',
  cableManagement: 'fully-concealed-tray',
  controller: 'flush-under-right-edge',
  cornerRadiusMm: 70
};
desk.render3d = {
  ...(desk.render3d ?? {}),
  variantId: 'luxuryElectricBladePedestal',
  primaryMaterial: 'smokedWalnut',
  secondaryMaterial: 'champagneBronze',
  accentMaterial: 'warmTaupeLeather',
  visibleIn3d: true
};
desk.notes = '正常使用时按740mm坐姿高度展示；可在650–1250mm范围电动升降。双宽刀片升降柱取代外露黑色T脚，保留电机横梁、隐藏线槽及右侧触控器。';

workspace.updatedAt = new Date().toISOString();
workspace.dataRevision = '2F-layout-review-v4-20260810';
fs.writeFileSync(dataUrl, `${JSON.stringify(workspace, null, 2)}\n`);
console.log('Applied luxury sit-stand desk V4.');
