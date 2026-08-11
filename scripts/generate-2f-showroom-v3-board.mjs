import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("artifacts/2f-showroom-photoreal-v3-20260810");
const outputPath = path.join(outputDir, "2f-ten-cameras-v3-with-notes.html");
const views = [
  ["01-stair-arrival-two-bedroom-doors.png", "01｜楼梯到达层厅", "机位：二层楼梯到达平台｜看向：右侧双卧门与尽端主卧", "右侧父母房、儿童房门均可见；左侧仅为楼梯围护，无二层入户门。"],
  ["02-stair-void-night-corrected.png", "02｜楼梯挑空夜景", "机位：二层楼梯洞口边缘｜看向：下行楼梯", "保留夜景氛围和真实护栏；右侧为房门，左侧无虚构入户门。"],
  ["03-guest-bath-final.png", "03｜客卫定稿", "机位：客卫入口内侧｜看向：北端淋浴区", "沿用已确认布局：淋浴、马桶、单台盆；一窗一门。"],
  ["04-master-bed-single-bay-final.png", "04｜主卧床与唯一飘窗", "机位：主卧入口侧｜看向：1800双人床与南侧飘窗", "床区沿用定稿；全主卧只保留这一处高级窄框飘窗。"],
  ["05-master-east-wardrobe-chest-bathdoor.png", "05｜主卧东墙收纳", "机位：床尾侧｜看向：衣柜、五斗橱与主卫门", "2200×600衣柜在北段，800×350五斗橱紧邻主卫唯一移门。"],
  ["06-dressing-light-smoked-sitstand.png", "06｜衣帽间与升降桌", "机位：衣帽间入口｜看向：窗前工作区", "两侧600深浅烟玻璃柜；中部净宽1098；1800×700电动桌处于站立高度。"],
  ["07-master-bath-replanned-double-vanity.png", "07｜主卫重排方案", "机位：东南移门口｜看向：窗下浴缸与西南淋浴", "横浴缸—中段马桶—西南淋浴；东墙1600双台盆；仅一樘移门。"],
  ["08-parent-bedroom-compact-verified.png", "08｜父母房紧凑校核", "机位：父母房入口侧｜看向：床区、衣柜与阳台门", "1500床、1200×550移门柜；真实紧凑尺度，柜前约500净距。"],
  ["09-child-bedroom-wardrobe-desk-verified.png", "09｜儿童房收纳学习墙", "机位：儿童房入口侧｜看向：东床、西柜桌与阳台", "东墙1200床；西墙1200衣柜+1000书桌；门外为封闭共享阳台。"],
  ["10-enclosed-shared-balcony-storage.png", "10｜封闭共享阳台", "机位：阳台东端｜沿5592mm长度向西", "净深约1500；左侧两房推拉门、右侧通高封窗、两端350深浅柜。"]
];

const cards = [];
for (const [file, title, position, check] of views) {
  const image = await readFile(path.join(outputDir, file));
  cards.push(`<article><div class="image"><img src="data:image/png;base64,${image.toString("base64")}"/></div><div class="caption"><h2>${title}</h2><p class="position">${position}</p><p class="check">校核：${check}</p></div></article>`);
}

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;background:#ebe6de;color:#302923;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}main{width:1780px;padding:48px 52px 64px}header{margin-bottom:30px}h1{margin:0;font-size:36px;letter-spacing:.5px}header p{margin:10px 0 0;color:#70645a;font-size:17px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}article{overflow:hidden;border:1px solid #d3c7ba;border-radius:18px;background:#fffaf4;box-shadow:0 10px 28px rgba(67,52,39,.10)}.image{height:420px;background:#2b2825;display:flex;align-items:center;justify-content:center}.image img{display:block;width:100%;height:100%;object-fit:contain}.caption{padding:17px 20px 20px;border-top:1px solid #e2d7ca;min-height:132px}.caption h2{margin:0 0 10px;font-size:21px}.caption p{margin:5px 0;font-size:15px;line-height:1.55;color:#5e544b}.caption .position{color:#3a332d;font-weight:650}.caption .check{color:#8d452f;font-weight:700}
</style></head><body><main><header><h1>2F｜10个机位写实效果图（确认调整版 V3）</h1><p>已同步：父母房与儿童房净距、主卫洁具与移门、浅烟玻璃衣帽间、电动升降桌及封闭共享阳台。</p></header><section class="grid">${cards.join("")}</section></main></body></html>`;

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, html, "utf8");
console.log(outputPath);
