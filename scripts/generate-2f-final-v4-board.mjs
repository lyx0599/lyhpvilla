import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('artifacts/2f-ten-cameras-final-v4-20260810');
const outputPath = path.join(outputDir, '2f-final-ten-cameras-v4.html');
const views = [
  ['01-true-stair-arrival.png', '01｜真实上楼到达', '从右侧上行梯段落地后向东看；楼梯洞口在身后。'],
  ['02-hall-lookback-two-bedroom-doors-night.png', '02｜起居室回看楼梯夜景', '向西回看；左侧两樘木门为儿童房和父母房，尽端为楼梯。'],
  ['03-guest-bath-final.png', '03｜客卫定稿', '客卫入口向北看；淋浴、马桶、单台盆，一窗一门。'],
  ['04-master-bed-single-bay-final.png', '04｜主卧床区定稿', '主卧入口侧看1800双人床与唯一飘窗。'],
  ['05-master-storage-wall-detail.png', '05｜主卧东墙收纳细节', '看通顶衣柜、五斗橱与主卫门；完整位置关系以附带主卧平面为准。'],
  ['06-luxury-electric-sitstand-desk.png', '06｜衣帽间高定升降桌', '浅烟玻璃柜与1800×700胡桃木电动升降桌。'],
  ['07-master-bath-final.png', '07｜主卫定稿', '东南移门看横浴缸、西南淋浴、马桶和东墙双台盆。'],
  ['08-parent-bedroom-final.png', '08｜父母房定稿', '入口看1500双人床、浅移门柜和独立阳台门。'],
  ['09-child-bedroom-final.png', '09｜儿童房定稿', '入口看东墙床、西墙衣柜书桌及独立阳台门。'],
  ['10-compact-independent-enclosed-balcony.png', '10｜独立封闭小阳台', '从儿童房看约1.3m深、约3.8㎡的独立封窗阳台。']
];

const cards = [];
for (const [file, title, description] of views) {
  const image = await readFile(path.join(outputDir, file));
  cards.push(`<article><div class="image"><img src="data:image/png;base64,${image.toString('base64')}"/></div><div class="caption"><h2>${title}</h2><p>${description}</p></div></article>`);
}

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;background:#ebe6de;color:#302923;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}main{width:1780px;padding:48px 52px 64px}header{margin-bottom:30px}h1{margin:0;font-size:36px}header p{margin:10px 0 0;color:#70645a;font-size:17px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}article{overflow:hidden;border:1px solid #d3c7ba;border-radius:18px;background:#fffaf4;box-shadow:0 10px 28px rgba(67,52,39,.10)}.image{height:420px;background:#2b2825;display:flex;align-items:center;justify-content:center}.image img{display:block;width:100%;height:100%;object-fit:contain}.caption{padding:17px 20px 20px;border-top:1px solid #e2d7ca;min-height:112px}.caption h2{margin:0 0 8px;font-size:21px}.caption p{margin:0;font-size:15px;line-height:1.55;color:#6f493a;font-weight:650}
</style></head><body><main><header><h1>2F｜10个机位写实效果图（最终整合 V4）</h1><p>锁定客卫、主卧床区、主卫及两间小房；更新真实上楼方向、回看双卧门、高定升降桌与两个独立小阳台。</p></header><section class="grid">${cards.join('')}</section></main></body></html>`;

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, html, 'utf8');
console.log(outputPath);
