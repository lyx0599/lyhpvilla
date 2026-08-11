import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dataPath = path.join(root, 'data', 'default-workspace.json');
const backupPath = path.join(root, 'data', 'backups', 'default-workspace-20260810-before-2f-approved-v2.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const structure = data.houseStructuresByFloor?.['2F'];
if (!structure) throw new Error('Missing 2F structure');

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
if (!fs.existsSync(backupPath)) fs.copyFileSync(dataPath, backupPath);

const byId = (items, id) => items.find((item) => item.id === id);
const requireById = (items, id) => {
  const item = byId(items, id);
  if (!item) throw new Error(`Missing required item: ${id}`);
  return item;
};
const mm = (value) => Math.round(value);
const setDimensions = (item, width, depth, height = (item?.dimensions?.height ?? 10) * 10) => {
  item.dimensions = { width: mm(width) / 10, depth: mm(depth) / 10, height: mm(height) / 10, unit: 'cm' };
};
const setPositionMm = (item, x, y, rotation = item?.position?.rotation ?? 0) => {
  item.position = {
    x: mm(x) / structure.coordinateSystem.width * 100,
    y: mm(y) / structure.coordinateSystem.height * 100,
    rotation
  };
};

// 1) 主卧东侧：保留已确认的“衣柜在东墙、五斗橱紧邻主卫门”。
const masterWardrobe = requireById(data.furniture, 'furn-2f-master-bedroom-large-wardrobe-001');
setPositionMm(masterWardrobe, 9195, 4200, 90);
masterWardrobe.name = '主卧东墙通顶大衣柜（定稿）';
masterWardrobe.notes = '与五斗橱交换后的定稿位置；柜门朝主卧，避开主卫门套。';

const masterChest = requireById(data.furniture, 'furn-2f-master-bedroom-chest-001');
setPositionMm(masterChest, 9320, 5700, 90);
masterChest.name = '主卧五斗橱（主卫门侧）';
masterChest.notes = '紧邻主卫门，作为浴前衣物、睡衣与床品零碎收纳。';

// 2) 衣帽间：柜体进深仍为标准600mm，降低玻璃与框架的压迫感；书桌明确为电动升降桌。
for (const id of ['module-2f-cloak-left', 'module-2f-cloak-right']) {
  const cabinet = requireById(data.furniture, id);
  setDimensions(cabinet, 2580, 600, 2750);
  cabinet.visual = {
    ...(cabinet.visual ?? {}),
    glassTone: 'light-smoked-bronze',
    glassOpacity: 0.42,
    frameColor: '#4b4138',
    frameDensity: 'low',
    interiorFinish: 'warm-light-oak',
    interiorLighting: '3000K-integrated'
  };
  cabinet.notes = '标准600mm进深；浅烟茶玻璃、减框分格和暖木内胆，避免深黑玻璃造成压抑。';
}

const sitStandDesk = requireById(data.furniture, 'module-2f-window-desk');
setDimensions(sitStandDesk, 1800, 700, 1050);
sitStandDesk.variant = 'electricSitStandWood';
sitStandDesk.name = '1.8m×0.7m大木板电动升降电脑桌';
sitStandDesk.heightRangeMm = [650, 1250];
sitStandDesk.currentHeightMm = 1050;
sitStandDesk.visual = {
  ...(sitStandDesk.visual ?? {}),
  top: 'solid-walnut-slab',
  legs: 'visible-black-electric-t-legs',
  controller: 'right-under-desk'
};
sitStandDesk.notes = '效果图采用站立高度约1050mm，清楚显示电动T形桌腿和控制器。';

// 3) 主卫：浴缸横置窗下，淋浴移到西南，马桶位于浴缸与淋浴之间，东墙双台盆；门移至东南并改移门。
const masterBathDoor = requireById(structure.doors, 'D-2F-007');
masterBathDoor.positionOnWall = 0.902;
masterBathDoor.width = 800;
masterBathDoor.operation = 'sliding';
masterBathDoor.swingDirection = 'left';
masterBathDoor.defaultOpenAmount = 0.55;
masterBathDoor.name = '主卫东南移门（调整后）';
masterBathDoor.notes = '为避让西南淋浴区移至东南侧，采用墙外/暗藏移门，不占卫生间内部回转空间。';

const tub = requireById(data.furniture, 'furn-2f-master-bathtub-001');
setDimensions(tub, 1700, 700, 600);
setPositionMm(tub, 8588, 700, 0);
tub.name = '窗下横置独立浴缸';
tub.notes = '1700mm浴缸沿北侧窗横置。';

const toilet = requireById(data.furniture, 'furn-2f-master-toilet-001');
setDimensions(toilet, 600, 700, 780);
setPositionMm(toilet, 7981, 1520, 0);
toilet.name = '浴缸与淋浴间之间的智能马桶';

const shower = requireById(data.furniture, 'furn-2f-master-shower-001');
setDimensions(shower, 800, 850, 2150);
setPositionMm(shower, 8081, 2575, 0);
shower.name = '西南角玻璃淋浴间';
shower.notes = '按用户要求由东北角移至原马桶侧；800×850mm紧凑型。';

const vanity = requireById(data.furniture, 'furn-2f-master-vanity-001');
setDimensions(vanity, 1600, 450, 850);
setPositionMm(vanity, 9270, 1700, 90);
vanity.name = '东墙1600mm双台盆浴室柜';
vanity.variant = 'doubleBasin';
vanity.basinCount = 2;
vanity.notes = '效果图必须完整呈现两个台盆与镜柜。';

// 4) 父母房：1500床保留；衣柜改为550mm深移门，并取得约500mm真实柜前净距。
const parentBed = requireById(data.furniture, 'furn-2f-bedroom1-bed-001');
setDimensions(parentBed, 1500, 2000, 550);
setPositionMm(parentBed, 1950, 6950, 270);
parentBed.name = '父母房1500mm双人床';

const parentWardrobe = requireById(data.furniture, 'furn-2f-bedroom1-wardrobe-001');
setDimensions(parentWardrobe, 1200, 550, 2400);
setPositionMm(parentWardrobe, 1625, 5425, 0);
parentWardrobe.name = '父母房1200mm浅深移门衣柜';
parentWardrobe.doorType = 'sliding';
parentWardrobe.clearanceMeta = { frontMm: 500, status: 'compact-but-usable' };
parentWardrobe.notes = '550mm柜深、移门，避免开门与床侧冲突；柜前约500mm，为小房间的紧凑可用值。';

// 5) 儿童房：床靠东墙；西墙形成“衣柜+书桌”连续功能带，入户门改移门消除门扇碰撞。
const childDoor = requireById(structure.doors, 'D-2F-004');
childDoor.operation = 'sliding';
childDoor.width = 850;
childDoor.defaultOpenAmount = 0.2;
childDoor.name = '儿童房入户移门';
childDoor.notes = '释放西墙给衣柜与书桌，避免原平开门与书桌碰撞。';

const childBed = requireById(data.furniture, 'furn-2f-bedroom2-bed-001');
setDimensions(childBed, 1200, 2000, 520);
setPositionMm(childBed, 5942, 6650, 0);
childBed.name = '儿童房1200mm成长床（东墙）';

const childWardrobe = requireById(data.furniture, 'module-2f-wardrobe-002');
setDimensions(childWardrobe, 1200, 550, 2400);
setPositionMm(childWardrobe, 4172, 5900, 90);
childWardrobe.name = '儿童房西墙1200mm衣柜';
childWardrobe.doorType = 'sliding';
childWardrobe.notes = '与书桌形成连续功能带；床与柜之间约895mm净距。';

const childDesk = requireById(data.furniture, 'furn-2f-bedroom2-desk-001');
setDimensions(childDesk, 1000, 450, 750);
setPositionMm(childDesk, 4122, 7150, 90);
childDesk.name = '儿童房西墙1000mm学习桌';
childDesk.notes = '衣柜下方延续同一面墙，面向房内；与床之间约995mm净距。';

const childBalconyDoor = requireById(structure.doors, 'D-2F-010');
childBalconyDoor.width = 1400;
childBalconyDoor.positionOnWall = 0.281;
childBalconyDoor.notes = '向西微调并收窄至1400mm，避开东墙床尾，同时保留共享阳台通行。';

// 6) 共享阳台封窗：保留两房连通属性，外沿改为通高断桥铝玻璃，并在两端增加浅柜。
const balconyId = 'OD-2F-SHARED-BALCONY-001';
const sharedBalcony = requireById(structure.outdoors, balconyId);
sharedBalcony.name = '封闭式共享阳台（父母房+儿童房连通）';
sharedBalcony.enclosure = {
  type: 'thermal-break-aluminum-glazing',
  heightMm: 2600,
  glass: 'low-e-double-glazing',
  frameColor: '#796d61',
  openingPanels: 4
};
sharedBalcony.notes = '阳台外沿封窗，父母房与儿童房仍通过各自内侧推拉门进入同一共享阳台；两端设置350mm浅柜，中部保持连续通行。';

for (const fence of structure.fences.filter((item) => item.floorId === '2F' && item.id.includes('2F-BALCONY'))) {
  fence.name = fence.id.includes('SOUTH') ? '共享阳台南侧通高封窗' : '共享阳台端部通高封窗';
  fence.material = 'glass';
  fence.height = 2600;
  fence.thickness = 70;
  fence.visual = {
    system: 'thermal-break-aluminum',
    frameColor: '#796d61',
    mullionDensity: 'low',
    glass: 'low-e-clear'
  };
}

const balconyCabinetTemplate = structuredClone(parentWardrobe);
const balconyCabinetBase = {
  ...balconyCabinetTemplate,
  floorId: '2F',
  roomId: null,
  outdoorZoneId: balconyId,
  category: 'storage',
  doorType: 'sliding',
  dimensions: { width: 70, depth: 35, height: 220, unit: 'cm' },
  visual: {
    finish: 'warm-greige-matte',
    plinth: 'moisture-resistant',
    handles: 'recessed'
  }
};

const balconyCabinets = [
  {
    ...structuredClone(balconyCabinetBase),
    id: 'furn-2f-shared-balcony-west-cabinet-001',
    name: '共享阳台西端浅收纳柜',
    position: { x: 1125 / structure.coordinateSystem.width * 100, y: 8425 / structure.coordinateSystem.height * 100, rotation: 90 },
    notes: '700×350mm通顶浅柜，收纳清洁工具与园艺用品。'
  },
  {
    ...structuredClone(balconyCabinetBase),
    id: 'furn-2f-shared-balcony-east-cabinet-001',
    name: '共享阳台东端浅收纳柜',
    position: { x: 6367 / structure.coordinateSystem.width * 100, y: 8425 / structure.coordinateSystem.height * 100, rotation: 90 },
    notes: '700×350mm通顶浅柜，与西端柜呼应，中部通道不受影响。'
  }
];
data.furniture = data.furniture.filter((item) => !balconyCabinets.some((cabinet) => cabinet.id === item.id));
data.furniture.push(...balconyCabinets);

// 7) 更新为本轮十个互不重复的校核机位。坐标单位为米、原点沿用现有3D场景。
data.cameraViews = data.cameraViews.filter((camera) => !camera.id.startsWith('designer-camera-2f-'));
data.cameraViews.push(
  {
    id: 'designer-camera-2f-v3-01-stair-arrival', floor: '2F', order: 1,
    name: '01 楼梯抵达层厅—右侧双卧门可见',
    cameraPosition: { x: -2.6, y: 1.62, z: -0.45 }, target: { x: -0.65, y: 1.42, z: 0.55 }, fov: 58, zoom: 1.02, mode: 'perspective', scope: 'floor',
    targetArea: 'ROOM-2F-007', description: '左侧仅为楼梯围护，不生成入户门；右侧必须看见父母房和儿童房门。'
  },
  {
    id: 'designer-camera-2f-v3-02-stair-night', floor: '2F', order: 2,
    name: '02 楼梯挑空夜景',
    cameraPosition: { x: -3.55, y: 1.7, z: -0.25 }, target: { x: -4.45, y: 0.9, z: 0.85 }, fov: 62, zoom: 1.02, mode: 'perspective', scope: 'floor',
    targetArea: 'ROOM-2F-008', description: '保留夜景氛围；明确楼梯口关系，无二层入户门。'
  },
  {
    id: 'designer-camera-2f-v3-03-guest-bath', floor: '2F', order: 3,
    name: '03 客卫定稿',
    cameraPosition: { x: -3.35, y: 1.55, z: -3.55 }, target: { x: -4.05, y: 1.1, z: -2.65 }, fov: 68, zoom: 1.02, mode: 'perspective', scope: 'floor',
    targetArea: 'ROOM-2F-001', description: '沿用已定稿客卫，不改布局。'
  },
  {
    id: 'designer-camera-2f-v3-04-master-bed', floor: '2F', order: 4,
    name: '04 主卧床与唯一飘窗定稿',
    cameraPosition: { x: 2.9, y: 1.55, z: 2.65 }, target: { x: 1.85, y: 1.0, z: 1.15 }, fov: 64, zoom: 1.02, mode: 'perspective', scope: 'floor',
    targetArea: 'ROOM-2F-006', description: '只出现南侧唯一飘窗，床区沿用已确认方案。'
  },
  {
    id: 'designer-camera-2f-v3-05-master-storage', floor: '2F', order: 5,
    name: '05 主卧东墙衣柜—五斗橱—主卫门',
    cameraPosition: { x: 1.15, y: 1.58, z: 2.25 }, target: { x: 3.15, y: 1.05, z: 1.0 }, fov: 66, zoom: 1.02, mode: 'perspective', scope: 'floor',
    targetArea: 'ROOM-2F-006', description: '必须完整呈现衣柜在前、五斗橱紧邻主卫移门的关系。'
  },
  {
    id: 'designer-camera-2f-v3-06-dressing', floor: '2F', order: 6,
    name: '06 衣帽间浅烟玻璃与升降桌',
    cameraPosition: { x: 0.55, y: 1.6, z: -1.25 }, target: { x: 0.55, y: 1.05, z: -3.65 }, fov: 72, zoom: 1.02, mode: 'perspective', scope: 'floor',
    targetArea: 'ROOM-2F-002', description: '浅烟玻璃、低密度框、电动桌处于1050mm站立高度；真实中间净宽1098mm。'
  },
  {
    id: 'designer-camera-2f-v3-07-master-bath', floor: '2F', order: 7,
    name: '07 主卫完整布局',
    cameraPosition: { x: 2.85, y: 1.58, z: -1.35 }, target: { x: 2.55, y: 1.0, z: -3.35 }, fov: 74, zoom: 1.02, mode: 'perspective', scope: 'floor',
    targetArea: 'ROOM-2F-003', description: '窗下横浴缸、西侧马桶与西南淋浴、东墙双台盆、东南移门均需可读。'
  },
  {
    id: 'designer-camera-2f-v3-08-parent', floor: '2F', order: 8,
    name: '08 父母房紧凑真实布局',
    cameraPosition: { x: -4.55, y: 1.55, z: 2.95 }, target: { x: -3.75, y: 1.0, z: 1.55 }, fov: 70, zoom: 1.02, mode: 'perspective', scope: 'floor',
    targetArea: 'ROOM-2F-004', description: '1500床、1200×550移门柜；不要夸大面积，柜前约500mm。'
  },
  {
    id: 'designer-camera-2f-v3-09-child', floor: '2F', order: 9,
    name: '09 儿童房东床西侧衣柜书桌',
    cameraPosition: { x: -0.05, y: 1.55, z: 3.05 }, target: { x: -0.75, y: 1.05, z: 1.55 }, fov: 70, zoom: 1.02, mode: 'perspective', scope: 'floor',
    targetArea: 'ROOM-2F-005', description: '东墙1200床、西墙连续衣柜+书桌，衣柜必须清晰可见。'
  },
  {
    id: 'designer-camera-2f-v3-10-balcony', floor: '2F', order: 10,
    name: '10 封闭共享阳台与两端浅柜',
    cameraPosition: { x: -2.25, y: 1.55, z: 4.55 }, target: { x: -2.25, y: 1.15, z: 3.25 }, fov: 70, zoom: 1.02, mode: 'perspective', scope: 'floor',
    targetArea: balconyId, description: '外沿通高封窗、两端350mm浅柜、父母房与儿童房两樘内侧推拉门均要可读。'
  }
);

data.updatedAt = new Date().toISOString();
data.dataRevision = '2F-approved-v2-20260810';
data.defaultWorkspaceRevision = `${data.defaultWorkspaceRevision ?? 'workspace'}+2f-v2`;

fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(JSON.stringify({
  dataPath,
  backupPath,
  revision: data.dataRevision,
  cameraCount: data.cameraViews.filter((camera) => camera.floor === '2F' && camera.id.startsWith('designer-camera-2f-v3-')).length,
  balconyCabinets: balconyCabinets.map((item) => item.id)
}, null, 2));
