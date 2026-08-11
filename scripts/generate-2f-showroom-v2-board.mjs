import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("artifacts/2f-showroom-photoreal-v2-20260810");
const outputPath = path.join(outputDir, "2f-ten-cameras-with-notes.html");
const views = [
  {
    file: "01-stair-arrival-corridor.png",
    title: "01｜楼梯到达与二层走廊",
    position: "机位：二层实体到达平台｜看向：二层走廊与各房门",
    design: "设计：暖灰墙面、深古铜收边与连续灯槽，形成安静的二层公共过渡。",
    check: "校核：不设家庭厅家具；主卧门仅作为远端动线背景。"
  },
  {
    file: "02-stair-void-night.png",
    title: "02｜楼梯洞口夜景",
    position: "机位：楼梯洞口边缘｜看向：下行楼梯与右侧房门",
    design: "设计：扶手、踏步和墙面低位照明共同保证夜间安全。",
    check: "校核：保留真实楼梯洞口与护栏；远端为实墙，不新增窗。"
  },
  {
    file: "03-guest-bath-overall.png",
    title: "03｜客卫完整全景",
    position: "机位：客卫入口｜看向：北端淋浴区",
    design: "设计：浅色石材、暖灰镜柜和古铜五金，延续样板间语言。",
    check: "校核：淋浴—马桶—900台盆依次布置；无浴缸、无第二门。"
  },
  {
    file: "04-master-bed-bay.png",
    title: "04｜主卧床区与唯一飘窗",
    position: "机位：主卧入口侧｜看向：1800双人床与南侧飘窗",
    design: "设计：低对比植物织物、弧形灯槽和内建窗边坐榻，避免酒店式沙发。",
    check: "校核：双床头柜；全主卧只保留这一处飘窗。"
  },
  {
    file: "05-master-east-storage.png",
    title: "05｜主卧东侧收纳",
    position: "机位：床尾/飘窗侧｜看向：东侧衣柜与主卫连接",
    design: "设计：通顶柜、五斗橱、展示层板和暖光组成日常更衣收纳面。",
    check: "校核：2200×600衣柜＋800×350五斗橱；房门不再居中。"
  },
  {
    file: "06-dressing-glass-desk.png",
    title: "06｜深色玻璃衣帽间与升降桌",
    position: "机位：衣帽间入口｜看向：窗前工作区",
    design: "设计：烟熏玻璃外门包裹样板间式金属挂衣、抽屉及暖光系统。",
    check: "校核：两侧全深衣柜；窗前为1800×700电动升降电脑桌。"
  },
  {
    file: "07-master-bath-complete.png",
    title: "07｜主卫完整全景",
    position: "机位：主卫唯一入口｜看向：浴缸、淋浴和东侧浴室柜",
    design: "设计：暖白石材、深色圆镜收纳柜和通透玻璃参考样板间。",
    check: "校核：保留1700浴缸、马桶、淋浴和1600台盆；无鱼缸、无第二门。"
  },
  {
    file: "08-parent-bedroom-overall.png",
    title: "08｜父母房整体",
    position: "机位：父母房入口侧｜看向：床区与南侧阳台移门",
    design: "设计：适老床高、圆角床头柜、双侧阅读灯和清晰夜间照明。",
    check: "校核：1500双人床、1200衣柜及连续床边通道均保留。"
  },
  {
    file: "09-child-bedroom-overall.png",
    title: "09｜儿童房整体",
    position: "机位：儿童房入口侧｜看向：床、书桌及南侧阳台",
    design: "设计：样板间暖灰底色配鼠尾草绿、锈橙和可成长学习区。",
    check: "校核：1400衣柜、书桌、儿童床和阳台动线同时可见。"
  },
  {
    file: "10-shared-balcony-verification.png",
    title: "10｜两间卧室共用阳台校核",
    position: "机位：共享阳台南侧中部｜看向：父母房与儿童房两组移门",
    design: "设计：暖灰防滑砖、通透护栏与轻量绿植，不挤占通行。",
    check: "校核：两组移门连接同一条连续阳台；中间无隔断、无高差。"
  }
];

const cards = [];
for (const view of views) {
  const image = await readFile(path.join(outputDir, view.file));
  cards.push(`<article><div class="image"><img src="data:image/png;base64,${image.toString("base64")}"/></div><div class="caption"><h2>${view.title}</h2><p class="position">${view.position}</p><p>${view.design}</p><p class="check">${view.check}</p></div></article>`);
}

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;background:#ebe6de;color:#302923;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}main{width:1780px;padding:48px 52px 64px}header{margin-bottom:30px}h1{margin:0;font-size:36px;letter-spacing:.5px}header p{margin:10px 0 0;color:#70645a;font-size:17px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}article{overflow:hidden;border:1px solid #d3c7ba;border-radius:18px;background:#fffaf4;box-shadow:0 10px 28px rgba(67,52,39,.10)}.image{height:420px;background:#2b2825;display:flex;align-items:center;justify-content:center}.image img{display:block;width:100%;height:100%;object-fit:contain}.caption{padding:17px 20px 20px;border-top:1px solid #e2d7ca;min-height:174px}.caption h2{margin:0 0 10px;font-size:21px}.caption p{margin:5px 0;font-size:15px;line-height:1.55;color:#5e544b}.caption .position{color:#3a332d;font-weight:650}.caption .check{color:#8d452f;font-weight:700}
</style></head><body><main><header><h1>2F｜10个固定机位写实效果图（样板间风格修订版）</h1><p>户型以确认版2D/3D模型为准；材质、顶面、灯光与收纳细节参考2F样板间视频。每张均标注机位、方向、设计意图和户型校核点。</p></header><section class="grid">${cards.join("")}</section></main></body></html>`;

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, html, "utf8");
console.log(outputPath);
