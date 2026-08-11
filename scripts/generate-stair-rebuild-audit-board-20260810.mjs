import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve("artifacts/stair-rebuild-audit-20260810");
await mkdir(outDir, { recursive: true });

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);

function arrow(x1, y1, x2, y2, color, label, labelY = -10) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="7" marker-end="url(#arrow-${color.slice(1)})"/><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + labelY}" text-anchor="middle" class="arrow-label" fill="${color}">${esc(label)}</text>`;
}

const defs = `<defs>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="7" stdDeviation="10" flood-color="#1c1917" flood-opacity=".12"/></filter>
  <marker id="arrow-2563eb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"/></marker>
  <marker id="arrow-dc2626" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626"/></marker>
  <marker id="arrow-57534e" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#57534e"/></marker>
</defs>`;

const style = `<style>
  text{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}.title{font-size:34px;font-weight:750;fill:#1c1917}.subtitle{font-size:18px;fill:#78716c}.card-title{font-size:24px;font-weight:720;fill:#292524}.small{font-size:15px;fill:#57534e}.dim{font-size:16px;font-weight:650;fill:#44403c}.arrow-label{font-size:17px;font-weight:750}.note{font-size:17px;fill:#44403c}.badge{font-size:15px;font-weight:700;fill:#fff}
</style>`;

function floorCard({ x, y, floor, upper, lower, terminal, bedroomDoor }) {
  const cardW = 710;
  const cardH = 360;
  const coreX = x + 68;
  const coreY = y + 88;
  const coreW = 500;
  const laneH = 110;
  const gapH = 9;
  const landingW = 142;
  const upperY = coreY;
  const lowerY = coreY + laneH + gapH;
  const flightStart = coreX + coreW - 18;
  const landingEdge = coreX + landingW;
  let arrows = "";
  if (upper) arrows += arrow(flightStart, upperY + laneH / 2, landingEdge + 8, upperY + laneH / 2, upper.kind === "up" ? "#2563eb" : "#dc2626", upper.label);
  if (lower) arrows += arrow(flightStart, lowerY + laneH / 2, landingEdge + 8, lowerY + laneH / 2, lower.kind === "up" ? "#2563eb" : "#dc2626", lower.label);
  const mutedUpper = !upper ? .22 : 1;
  const mutedLower = !lower ? .22 : 1;
  const door = bedroomDoor ? `<circle cx="${coreX + 150}" cy="${coreY + 254}" r="7" fill="#a16207"/><text x="${coreX + 168}" y="${coreY + 260}" class="small" fill="#92400e">卧室门向室内右开，不侵入楼梯公区</text>` : "";
  return `<g filter="url(#shadow)"><rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="24" fill="#fff"/></g>
    <text x="${x + 32}" y="${y + 44}" class="card-title">${esc(floor)}</text>
    <text x="${x + 665}" y="${y + 42}" text-anchor="end" class="small">${esc(terminal)}</text>
    <rect x="${coreX}" y="${upperY}" width="${coreW}" height="${laneH}" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="3" opacity="${mutedUpper}"/>
    <rect x="${coreX}" y="${lowerY}" width="${coreW}" height="${laneH}" rx="8" fill="#fee2e2" stroke="#dc2626" stroke-width="3" opacity="${mutedLower}"/>
    <rect x="${coreX}" y="${coreY}" width="${landingW}" height="${laneH * 2 + gapH}" rx="8" fill="#e7e5e4" stroke="#78716c" stroke-width="3"/>
    <line x1="${coreX + landingW}" y1="${coreY}" x2="${coreX + landingW}" y2="${coreY + laneH * 2 + gapH}" stroke="#78716c" stroke-width="3" stroke-dasharray="8 7"/>
    ${arrows}
    <text x="${coreX + landingW / 2}" y="${coreY + 108}" text-anchor="middle" class="small">900平台</text>
    <text x="${coreX + landingW / 2}" y="${coreY + 132}" text-anchor="middle" class="small">半层转身</text>
    <line x1="${coreX}" y1="${coreY - 22}" x2="${coreX + coreW}" y2="${coreY - 22}" stroke="#57534e" stroke-width="2"/>
    <line x1="${coreX}" y1="${coreY - 30}" x2="${coreX}" y2="${coreY - 14}" stroke="#57534e" stroke-width="2"/><line x1="${coreX + coreW}" y1="${coreY - 30}" x2="${coreX + coreW}" y2="${coreY - 14}" stroke="#57534e" stroke-width="2"/>
    <text x="${coreX + coreW / 2}" y="${coreY - 31}" text-anchor="middle" class="dim">净区长度 3173</text>
    <line x1="${coreX + coreW + 22}" y1="${coreY}" x2="${coreX + coreW + 22}" y2="${coreY + laneH * 2 + gapH}" stroke="#57534e" stroke-width="2"/>
    <text x="${coreX + coreW + 43}" y="${coreY + 115}" transform="rotate(90 ${coreX + coreW + 43} ${coreY + 115})" text-anchor="middle" class="dim">900 + 70 + 900 = 1870</text>
    <text x="${coreX + coreW + 95}" y="${coreY + 68}" class="small">北 / 右侧</text><text x="${coreX + coreW + 95}" y="${coreY + 187}" class="small">南 / 左侧</text>
    ${door}`;
}

const planSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1030" viewBox="0 0 1600 1030">
${defs}${style}<rect width="1600" height="1030" fill="#f5f5f4"/>
<text x="70" y="74" class="title">全屋楼梯重构｜四层2D逻辑核对</text>
<text x="70" y="108" class="subtitle">依据原始户型图约3173×1870mm净区；蓝色上行、红色下行。视线从客厅朝西看：南侧在左，北侧在右。</text>
${floorCard({x:70,y:150,floor:"B2",upper:{kind:"up",label:"上行至 B1"},lower:null,terminal:"最底层：不生成继续下行"})}
${floorCard({x:820,y:150,floor:"B1",upper:{kind:"up",label:"右侧上行至 1F"},lower:{kind:"down",label:"左侧下行至 B2"},terminal:"上下双向"})}
${floorCard({x:70,y:550,floor:"1F",upper:{kind:"up",label:"右侧上行至 2F"},lower:{kind:"down",label:"左侧下行至 B1"},terminal:"卧室门同步核对",bedroomDoor:true})}
${floorCard({x:820,y:550,floor:"2F",upper:null,lower:{kind:"down",label:"下行至 1F"},terminal:"最顶层：不生成继续上行"})}
<g transform="translate(70 947)"><rect width="1460" height="55" rx="18" fill="#292524"/><text x="28" y="35" class="badge">固定原则：每层只显示真实到达/离开梯段；半层平台在普通3D中必须可见；B1弧形挑空独立于楼梯几何，不允许渲染成弧形楼梯。</text></g>
</svg>`;

const levels = [
  { name: "2F", y: 120, elevation: "+8400" },
  { name: "1F", y: 330, elevation: "+5600" },
  { name: "B1", y: 540, elevation: "+2800" },
  { name: "B2", y: 750, elevation: "±0" }
];
const levelLines = levels.map((level) => `<line x1="160" y1="${level.y}" x2="1420" y2="${level.y}" stroke="#a8a29e" stroke-width="3"/><text x="80" y="${level.y + 8}" class="card-title">${level.name}</text><text x="1450" y="${level.y + 7}" class="dim">${level.elevation}</text>`).join("");
const mid = (a,b)=>(a+b)/2;
const sectionSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="920" viewBox="0 0 1600 920">
${defs}${style}<rect width="1600" height="920" fill="#fafaf9"/><text x="70" y="68" class="title">全屋楼梯重构｜垂直剖面与同一逻辑</text><text x="70" y="102" class="subtitle">暂按层高2800mm、每层20级、每跑10级、单级高140mm；最终以现场结构标高复核。</text>
${levelLines}
<g stroke-linecap="round" stroke-linejoin="round" fill="none">
  <path d="M 1190 750 L 840 ${mid(750,540)} L 410 540" stroke="#2563eb" stroke-width="16"/><path d="M 410 540 L 840 ${mid(540,330)} L 1190 330" stroke="#2563eb" stroke-width="16"/><path d="M 1190 330 L 840 ${mid(330,120)} L 410 120" stroke="#2563eb" stroke-width="16"/>
  <path d="M 840 ${mid(750,540)} L 690 ${mid(750,540)}" stroke="#78716c" stroke-width="24"/><path d="M 840 ${mid(540,330)} L 690 ${mid(540,330)}" stroke="#78716c" stroke-width="24"/><path d="M 840 ${mid(330,120)} L 690 ${mid(330,120)}" stroke="#78716c" stroke-width="24"/>
</g>
<g>${[0,1,2].map((i)=>{const lower=levels[3-i],upper=levels[2-i],my=mid(lower.y,upper.y);return `<text x="760" y="${my-22}" text-anchor="middle" class="dim">半层平台 +${1400+i*2800}mm</text><text x="760" y="${my+38}" text-anchor="middle" class="small">900mm转身深度</text>`}).join("")}</g>
<g transform="translate(170 795)"><rect width="1230" height="88" rx="20" fill="#fff" stroke="#d6d3d1" stroke-width="2"/><text x="25" y="34" class="note">已解决：半层平台不再被普通3D隐藏；B2只上行、2F只下行；三组层间楼梯共享同一轴线和标高规则。</text><text x="25" y="64" class="note">仍需施工前确认：实际层高、楼板厚度、梁底与扶手完成面；目标梯段净高建议不低于2200mm。</text></g>
</svg>`;

await writeFile(path.join(outDir, "01-stair-core-plan.svg"), planSvg);
await writeFile(path.join(outDir, "02-stair-vertical-section.svg"), sectionSvg);
console.log(outDir);
