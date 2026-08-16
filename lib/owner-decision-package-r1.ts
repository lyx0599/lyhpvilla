export type DecisionStatus =
  | "CONFIRMED"
  | "OWNER_DECISION_REQUIRED"
  | "FIELD_REMEASURE"
  | "VENDOR_CONFIRM"
  | "PROFESSIONAL_SIGNOFF"
  | "BLOCKED";

export type DecisionItem = {
  id: string;
  floorId: "B2" | "B1" | "1F" | "2F" | "YARD";
  title: string;
  status: DecisionStatus;
  objectIds: string[];
  sourcePaths: string[];
  impact: string;
  latestDecisionMilestone: string;
  options: string[];
  defaultDeferredMeaning: string;
  userQuestion?: string;
};

export const ownerDecisionPackageR1 = {
  packageId: "OWNER_DECISION_PACKAGE_R1",
  revision: "whole-house-lighting-cabinet-yard-integration-v1-20260812",
  dataSha: "8790920b120e37b5fdd7515479caf1c28e478bd78823621434b14acfa18be831",
  classification: "REFERENCE / COMMUNICATION ONLY",
  disclaimer: "不修改主 data、Guard、施工、BOM、IFC 或采购；不把估算毫米当施工真值。",
  confirmedInputs: [
    "1F A/A/A：连续整墙干吧；墙边隐藏插座+预留空管；冰箱 placeholder。",
    "干吧无固定上下水意图；餐桌保留 4–6 / 8–10 双态；沙发可向电视方向有限移动。",
    "1F 1800mm 仅为研究目标；placeholder 不等于 SKU 或采购事实。"
  ],
  minimalUserQuestions: [
    {
      id: "Q-B2-LAYOUT-01",
      itemId: "DEC-B2-TABLE-WETBAR",
      question: "在现场复尺和湿吧 MEP 证据闭合后，B2 聚会桌—湿吧优先保留哪一种沟通方案？",
      options: ["A：桌位优先，湿吧保持当前参考位置", "B：湿吧优先，接受桌椅/通道重新排布", "Deferred：先不定，等复尺包回传"]
    },
    {
      id: "Q-2F-DESK-01",
      itemId: "DEC-2F-DESK-BRIDGE-CABINET",
      question: "2F 升降桌与桥柜是否按当前代表性参考方向继续深化？",
      options: ["A：保留升降桌—桥柜关系，待动态包络复核", "B：允许改为独立桌/柜段，待复尺后重算", "Deferred：不在本轮锁定"]
    }
  ],
  items: [
    {
      id: "CONF-1F-A-A-A",
      floorId: "1F",
      title: "A/A/A 连续整墙干吧 + 隐藏插座/预留空管 + 冰箱 placeholder",
      status: "CONFIRMED",
      objectIds: ["CAB-1F-DRYBAR-WALL", "MEP-1F-HIDDEN-POWER-CONDUIT", "APPL-1F-FRIDGE-PLACEHOLDER"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md", "components/owner-communication-model.tsx"],
      impact: "作为业主沟通基线影响干吧语言、插座预留和冰箱占位；不形成施工尺寸或 SKU。",
      latestDecisionMilestone: "当前沟通包锁定；PRE-IFC 前仍需证据分级",
      options: ["已锁定 A/A/A 参考方向"],
      defaultDeferredMeaning: "保持该参考方向，但所有尺寸、SKU、MEP 仍 deferred。"
    },
    {
      id: "CONF-1F-TABLE-DUAL-STATE",
      floorId: "1F",
      title: "餐桌 4–6 / 8–10 双态",
      status: "CONFIRMED",
      objectIds: ["FURN-1F-DINING-TABLE", "BOUNDS-1F-DINING-PERSONS"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md", "components/owner-communication-model.tsx"],
      impact: "影响桌椅、人位、门弧和 900mm 通道联算；不以单一摆态掩盖另一摆态。",
      latestDecisionMilestone: "复尺包回传前保持双态",
      options: ["4–6 人日常态", "8–10 人聚会态"],
      defaultDeferredMeaning: "双态同时保留，直到真实 bounds/门弧/通道复核。"
    },
    {
      id: "CONF-1F-DRYBAR-NO-FIXED-WATER",
      floorId: "1F",
      title: "干吧无固定上下水意图",
      status: "CONFIRMED",
      objectIds: ["MEP-1F-DRYBAR-WATER-INTENT"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md"],
      impact: "避免将干吧误写为湿吧；隐藏插座/预留空管仍需精装封闭前方案。",
      latestDecisionMilestone: "已登记；精装封闭前做专业签认",
      options: ["无固定水/排水；电气预留按证据深化"],
      defaultDeferredMeaning: "不自动增加上下水，不生成 MEP 施工闭合。"
    },
    {
      id: "CONF-1F-SOFA-LIMITED-TV-MOVE",
      floorId: "1F",
      title: "沙发聚会态向电视方向有限移动",
      status: "CONFIRMED",
      objectIds: ["FURN-1F-SOFA", "BOUNDS-1F-TV-SIDE"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md"],
      impact: "需与电视完成面、桌椅、人位、门弧和 900mm 通道联算。",
      latestDecisionMilestone: "复尺与空间 bounds 重算前",
      options: ["允许有限移动；不改变 P0 通道门禁"],
      defaultDeferredMeaning: "保留研究动作，不写成固定坐标。"
    },
    {
      id: "DEC-B2-TABLE-WETBAR",
      floorId: "B2",
      title: "桌—湿吧—柱—门弧的取舍",
      status: "OWNER_DECISION_REQUIRED",
      objectIds: ["FURN-B2-TABLE", "CAB-B2-WETBAR", "COL-B2-PARTY", "DOOR-B2-ARC"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md", "docs/artifacts/fancy-visual-contract-r1/FANCY_VISUAL_CONTRACT_R1.md"],
      impact: "决定聚会桌、湿吧体量和座位策略；必须同时满足门弧与 1100mm 通道。",
      latestDecisionMilestone: "B2 现场复尺 + 湿吧 MEP 证据后，PRE-IFC 前",
      options: ["桌位优先", "湿吧优先", "Deferred 等证据"],
      defaultDeferredMeaning: "不重排主 data；当前只保留候选，不进入柜体/BOM。",
      userQuestion: "在复尺和 MEP 证据闭合后，B2 采用桌位优先、湿吧优先，还是继续 deferred？"
    },
    {
      id: "FIELD-B2-CLEARANCES",
      floorId: "B2",
      title: "桌湿吧净距、椅—柱、门弧与 1100 通道",
      status: "FIELD_REMEASURE",
      objectIds: ["BOUNDS-B2-TABLE-WETBAR", "BOUNDS-B2-CHAIR-COLUMN", "BOUNDS-B2-DOOR-1100"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md"],
      impact: "决定候选能否继续进入参数化重算；不接受视觉比例替代现场尺寸。",
      latestDecisionMilestone: "B2 复尺包回传",
      options: ["补真实 dimensionRole/datum", "若冲突则保留多候选"],
      defaultDeferredMeaning: "候选冻结，不进入施工闭合或采购。"
    },
    {
      id: "PRO-B2-WETBAR-MEP",
      floorId: "B2",
      title: "湿吧给排水、防水与设备节点",
      status: "PROFESSIONAL_SIGNOFF",
      objectIds: ["MEP-B2-WETBAR", "NODE-B2-WETBAR-WATERPROOF"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md"],
      impact: "未签认不得闭合湿吧尺寸、设备表或采购接口。",
      latestDecisionMilestone: "PRE-IFC/精装封闭前",
      options: ["专业确认后纳入参数化包", "否则保持 deferred"],
      defaultDeferredMeaning: "不猜水电、防水或设备参数。"
    },
    {
      id: "FIELD-B1-GUEST-RAILING-LAUNDRY",
      floorId: "B1",
      title: "客房、栏杆、开放洞口与洗衣 MEP",
      status: "FIELD_REMEASURE",
      objectIds: ["ROOM-B1-GUEST", "RAIL-B1-STAIR", "MEP-B1-LAUNDRY"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md"],
      impact: "决定客房/楼梯/洗衣的可编辑几何与安全边界。",
      latestDecisionMilestone: "B1 现场/CAD 补证后",
      options: ["复尺并绑定 objectId/datum", "冲突项保留 BLOCKED"],
      defaultDeferredMeaning: "不以家具或 fancy 视觉覆盖安全/MEP unknown。"
    },
    {
      id: "PRO-B1-SAFETY-MEP",
      floorId: "B1",
      title: "栏杆、消防、洗衣给排水与 HVAC",
      status: "PROFESSIONAL_SIGNOFF",
      objectIds: ["FIRE-B1-GUEST", "RAIL-B1-CODE", "MEP-B1-LAUNDRY-HVAC"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md"],
      impact: "专业签认前不进入 IFC、节点或设备表。",
      latestDecisionMilestone: "PRE-IFC 专业会签",
      options: ["专业签认", "保持 deferred"],
      defaultDeferredMeaning: "保留 unknown，不推断法规或设备规格。"
    },
    {
      id: "BLOCK-B1-OPEN-ITEMS",
      floorId: "B1",
      title: "客房/栏杆/洗衣与 orphan 3D 证据未闭合",
      status: "BLOCKED",
      objectIds: ["ORPHAN-B1-3D", "P0-B1-GUEST-RAILING"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md"],
      impact: "冻结对应精修；不能用材质或家具候选掩盖证据缺口。",
      latestDecisionMilestone: "复尺/专业证据闭合后再评估",
      options: ["保持 BLOCKED", "补证后重新审计"],
      defaultDeferredMeaning: "不进入主 data、施工或采购链。"
    },
    {
      id: "FIELD-1F-LAYOUT-ENVELOPE",
      floorId: "1F",
      title: "桌椅、人位、门弧、900 通道、电视完成面与干吧深度",
      status: "FIELD_REMEASURE",
      objectIds: ["BOUNDS-1F-DINING", "BOUNDS-1F-PERSONS", "DOOR-1F-ARC", "CAB-1F-DRYBAR"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md", "components/owner-communication-model.tsx"],
      impact: "决定双态餐桌、沙发有限移动和连续干吧是否同时成立。",
      latestDecisionMilestone: "1F 复尺包 / 参数化导入前",
      options: ["按 objectId + datum + dimensionRole 导入", "冲突时原子回退"],
      defaultDeferredMeaning: "1800 继续是研究目标，不变成施工尺寸。"
    },
    {
      id: "VENDOR-1F-FRIDGE",
      floorId: "1F",
      title: "冰箱 SKU、铰链、开合、散热与柜体接口",
      status: "VENDOR_CONFIRM",
      objectIds: ["APPL-1F-FRIDGE-PLACEHOLDER", "CAB-1F-FRIDGE-OPENING"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md", "components/owner-communication-model.tsx"],
      impact: "供应商资料缺失时不得锁定开口、散热、BOM 或采购事实。",
      latestDecisionMilestone: "冰箱厂家资料进入 PRE-IFC 前",
      options: ["补 SKU/铰链/安装手册", "保持 placeholder"],
      defaultDeferredMeaning: "placeholder 只用于视觉参考，不是采购事实。"
    },
    {
      id: "PRO-1F-D05-POWER",
      floorId: "1F",
      title: "D-05 供电、隐藏插座与预留空管",
      status: "PROFESSIONAL_SIGNOFF",
      objectIds: ["MEP-1F-D05", "MEP-1F-HIDDEN-POWER-CONDUIT"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md"],
      impact: "精装封闭前未确认走线，不得以装饰方案替代；禁止裸露拖线。",
      latestDecisionMilestone: "精装封闭前",
      options: ["专业确认走线", "保持 deferred"],
      defaultDeferredMeaning: "不生成强弱电施工闭合或采购项。"
    },
    {
      id: "BLOCK-1F-FRIDGE-LAYOUT",
      floorId: "1F",
      title: "冰箱与餐桌/通道/干吧的综合包络",
      status: "BLOCKED",
      objectIds: ["BOUNDS-1F-FRIDGE", "BOUNDS-1F-DINING", "CAB-1F-DRYBAR-WALL"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md"],
      impact: "SKU、门弧和复尺未闭合前冻结综合布局。",
      latestDecisionMilestone: "厂家 + 复尺 + 专业证据齐套后",
      options: ["保持 BLOCKED", "证据齐套后原子重算"],
      defaultDeferredMeaning: "不删座、不缩干吧、不猜 SKU 来掩盖冲突。"
    },
    {
      id: "DEC-2F-DESK-BRIDGE-CABINET",
      floorId: "2F",
      title: "升降桌—桥柜动态包络",
      status: "OWNER_DECISION_REQUIRED",
      objectIds: ["FURN-2F-LIFT-DESK", "CAB-2F-BRIDGE"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md", "components/owner-communication-model.tsx"],
      impact: "决定家具家族候选与走行空间，但不应以视觉比例替代动态包络。",
      latestDecisionMilestone: "复尺/动态包络证据后，PRE-IFC 前",
      options: ["保留当前关系", "允许独立桌/柜段", "Deferred"],
      defaultDeferredMeaning: "只登记审美方向，不消费为几何或 BOM。",
      userQuestion: "2F 是否按当前升降桌—桥柜关系继续深化，还是允许拆成独立桌/柜段？"
    },
    {
      id: "FIELD-2F-ROOM-BOUNDS",
      floorId: "2F",
      title: "桥柜行程、主卫、阳台门槛与 roomId/camera 归属",
      status: "FIELD_REMEASURE",
      objectIds: ["BOUNDS-2F-BRIDGE-TRAVEL", "ROOM-2F-MASTER-BATH", "ROOM-2F-BALCONY", "CAMERA-2F-ROOM-MAP"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md"],
      impact: "影响家具包络、门槛/排水和房间导航真值。",
      latestDecisionMilestone: "2F CAD/现场复尺后",
      options: ["绑定真实 datum/bounds", "冲突项保持 BLOCKED"],
      defaultDeferredMeaning: "不修正 roomId/camera 冲突，不改主 data。"
    },
    {
      id: "PRO-2F-BATH-BALCONY",
      floorId: "2F",
      title: "主卫防水、给排水、阳台排水与门窗节点",
      status: "PROFESSIONAL_SIGNOFF",
      objectIds: ["MEP-2F-MASTER-BATH", "WATERPROOF-2F-MASTER-BATH", "DRAIN-2F-BALCONY"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md"],
      impact: "未签认不得闭合卫浴、阳台或门槛节点。",
      latestDecisionMilestone: "PRE-IFC 专业签认",
      options: ["专业签认", "保持 deferred"],
      defaultDeferredMeaning: "不把 fancy 材质方向当作防水/MEP 事实。"
    },
    {
      id: "BLOCK-2F-ROOM-CONFLICT",
      floorId: "2F",
      title: "房间身份、升降桌/桥柜、主卫与阳台未闭合",
      status: "BLOCKED",
      objectIds: ["ROOM-2F-ROOMID-CONFLICT", "CAB-2F-BRIDGE", "ROOM-2F-MASTER-BATH"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md"],
      impact: "冻结专属精修和施工化升级，保留当前沟通模型。",
      latestDecisionMilestone: "复尺 + 专业签认 + PMO 再审",
      options: ["保持 BLOCKED", "证据齐套后重新审计"],
      defaultDeferredMeaning: "不把样板机位或估算材料升级为全层真值。"
    },
    {
      id: "FIELD-YARD-DRAINAGE-CABINET",
      floorId: "YARD",
      title: "排水坡向、地漏、完成面与户外柜检修/开合",
      status: "FIELD_REMEASURE",
      objectIds: ["YARD-DRAIN-SLOPE", "YARD-FLOOR-FINISH", "CAB-YARD-SERVICE"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md", "components/yard-preview.tsx"],
      impact: "决定户外柜、铺装和水管理能否进入深化；不消费 L/SW-22。",
      latestDecisionMilestone: "YARD 现场/CAD 补证后",
      options: ["补真实标高/坡向/检修包络", "保持 reference/blocked"],
      defaultDeferredMeaning: "不猜坡度、地漏、完成面或柜体开合尺寸。"
    },
    {
      id: "VENDOR-YARD-BBQ",
      floorId: "YARD",
      title: "BBQ 燃料、排烟、窗洞、防风与户外柜耐候",
      status: "VENDOR_CONFIRM",
      objectIds: ["BBQ-YARD-NORTH", "CAB-YARD-OUTDOOR", "MEP-YARD-BBQ-EXHAUST"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md", "components/yard-preview.tsx"],
      impact: "供应商资料未齐不得锁设备开口、排烟或采购字段。",
      latestDecisionMilestone: "厂家资料进入 PRE-IFC 前",
      options: ["补产品/安装/排烟资料", "保持 reference placeholder"],
      defaultDeferredMeaning: "不把 BBQ marker、L/SW-22 或视觉估算消费成设备事实。"
    },
    {
      id: "PRO-YARD-SAFETY-MEP",
      floorId: "YARD",
      title: "防水、电气/RCD、IP、消防间距与家庭安全",
      status: "PROFESSIONAL_SIGNOFF",
      objectIds: ["WATERPROOF-YARD", "RCD-YARD", "FIRE-YARD-BBQ", "SAFETY-YARD-FAMILY"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md", "components/yard-preview.tsx"],
      impact: "决定户外设备/铺装能否施工化；老人儿童宠物安全必须保留 unknown。",
      latestDecisionMilestone: "PRE-IFC / 施工前专业签认",
      options: ["专业签认", "保持 deferred/blocked"],
      defaultDeferredMeaning: "不从实时视觉或 marker 推断防水、电气、消防间距。"
    },
    {
      id: "BLOCK-YARD-CONSTRUCTION",
      floorId: "YARD",
      title: "YARD 施工化边界与安全 unknown",
      status: "BLOCKED",
      objectIds: ["P0-YARD-DRAINAGE", "P0-YARD-ELECTRICAL", "P0-YARD-BBQ", "P0-YARD-SAFETY"],
      sourcePaths: ["docs/whole-house-audits/whole-house-P0-integration-watch-2026-08-12.md", "components/yard-preview.tsx"],
      impact: "冻结户外施工、BOM 和发布放行；参考层只供业主沟通。",
      latestDecisionMilestone: "现场 + 厂家 + 专业证据齐套后",
      options: ["保持 BLOCKED", "证据齐套后独立复审"],
      defaultDeferredMeaning: "不消费 L/SW-22，不把 Top5 机位或材质方向当施工合同。"
    }
  ] satisfies DecisionItem[]
} as const;

export const decisionStatusLabels: Record<DecisionStatus, string> = {
  CONFIRMED: "CONFIRMED · 已确认",
  OWNER_DECISION_REQUIRED: "OWNER DECISION REQUIRED · 待业主取舍",
  FIELD_REMEASURE: "FIELD REMEASURE · 待现场复尺",
  VENDOR_CONFIRM: "VENDOR CONFIRM · 待厂家资料",
  PROFESSIONAL_SIGNOFF: "PROFESSIONAL SIGNOFF · 待专业签认",
  BLOCKED: "BLOCKED · 冻结"
};
