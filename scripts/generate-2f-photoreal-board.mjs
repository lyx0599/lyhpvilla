import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("artifacts/2f-approved-layout-20260810/photoreal-10-cameras");
const outputPath = path.join(outputDir, "2f-photoreal-ten-camera-board.html");
const views = [
  ["01-stair-arrival-photoreal.png", "01｜楼梯到达与走廊"],
  ["02-stair-opening-night-photoreal.png", "02｜楼梯洞口关系（夜景）"],
  ["03-corridor-master-open-photoreal.png", "03｜走廊看开启的主卧双开门"],
  ["04-guest-bath-photoreal.png", "04｜客卫整体"],
  ["05-master-overview-photoreal.png", "05｜主卧：双人床 + 唯一飘窗"],
  ["06-master-reverse-storage-photoreal.png", "06｜主卧反向：大衣柜 + 五斗橱"],
  ["07-dark-glass-dressing-photoreal.png", "07｜深色玻璃衣帽间 + 1800×700升降桌"],
  ["08-master-bath-photoreal.png", "08｜主卫：浴缸 + 淋浴 + 浴室柜"],
  ["09-parent-balcony-photoreal.png", "09｜父母房 + 共用阳台"],
  ["10-child-balcony-photoreal.png", "10｜儿童房收纳 + 共用阳台"]
];

const cards = [];
for (const [fileName, label] of views) {
  const image = await readFile(path.join(outputDir, fileName));
  cards.push(`<figure><img src="data:image/png;base64,${image.toString("base64")}"/><figcaption>${label}</figcaption></figure>`);
}

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;background:#eee9e1;color:#302923;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}
main{width:1780px;padding:46px 52px 60px}h1{margin:0;font-size:34px;letter-spacing:1px}p{margin:10px 0 30px;color:#70645a;font-size:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:0;overflow:hidden;border:1px solid #d4c9bb;border-radius:18px;background:#fffaf4;box-shadow:0 10px 28px rgba(67,52,39,.10)}img{display:block;width:100%;aspect-ratio:3/2;object-fit:cover;background:#d8d0c4}figcaption{padding:15px 18px 17px;font-size:18px;font-weight:750;border-top:1px solid #e3d9cd}
</style></head><body><main><h1>2F｜10个固定机位写实效果图</h1><p>依据已确认的2D家具平面与对应3D机位写实化；材质与灯光统一，不改变门窗、墙体和主要家具关系。</p><section class="grid">${cards.join("")}</section></main></body></html>`;

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, html, "utf8");
console.log(outputPath);
