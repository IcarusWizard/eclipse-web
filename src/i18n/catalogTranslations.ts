import { AppLanguage } from './LanguageContext';

const SHIP_TYPE_ZH: Record<string, string> = {
  interceptor: '拦截机',
  cruiser: '巡洋舰',
  dreadnought: '无畏舰',
  starbase: '星际基地',
  orbital: '轨道站',
  ancient: '远古舰',
  guardian: '守护者',
  gcds: '银河中心防御系统',
};

const RESOURCE_ZH: Record<string, string> = {
  money: '信用点',
  science: '科研',
  material: '材料',
  materials: '材料',
  any: '任意资源',
};

const PHASE_ZH: Record<string, string> = {
  action: '行动阶段',
  ACTION: '行动阶段',
  combat: '战斗阶段',
  COMBAT: '战斗阶段',
  upkeep: '维护阶段',
  UPKEEP: '维护阶段',
  cleanup: '清理阶段',
  CLEANUP: '清理阶段',
  game_over: '游戏结束',
  GAME_OVER: '游戏结束',
  FINISHED: '游戏结束',
  setup: '初始设置',
};

const TECH_CATEGORY_ZH: Record<string, string> = {
  nano: '纳米科技',
  grid: '网格科技',
  military: '军事科技',
  rare: '稀有科技',
};

const TECH_ZH: Record<string, { name: string; description: string }> = {
  nanorobots: {
    name: '纳米机器人',
    description: '每次【建造】行动可至多建造 3 项（基础为 2 项）。',
  },
  fusion_drive: {
    name: '聚变引擎',
    description: '解锁舰船配件：聚变引擎（航速 2，先攻 +2，耗能 2）。',
  },
  orbital: {
    name: '轨道站',
    description: '允许在建造阶段建造轨道站（提供信用点/科研殖民位及游戏结束 1 VP）。',
  },
  advanced_robotics: {
    name: '高级机械学',
    description: '立即从储备区拿取 1 枚额外影响力圆片放到影响力轨上。',
  },
  advanced_labs: {
    name: '高级实验室',
    description: '允许在带有星标的进阶科研行星上殖民。',
  },
  monolith: {
    name: '巨石碑',
    description: '允许建造巨石碑建筑（花费 10 材料，游戏结束提供 3 VP）。',
  },
  wormhole_generator: {
    name: '虫洞发生器',
    description: '允许舰船在只需单侧虫洞相连的相邻星区之间移动或扩张影响力。',
  },
  artifact_key: {
    name: '遗物密钥',
    description: '每控制 1 颗带遗物标记的行星，立即从仓库获得 5 项任选资源。',
  },
  gauss_shield: {
    name: '高斯护盾',
    description: '解锁舰船配件：高斯护盾（使敌方命中检定 -1，无耗能）。',
  },
  fusion_source: {
    name: '聚变反应堆',
    description: '解锁舰船配件：聚变反应堆（提供 +6 能量）。',
  },
  improved_hull: {
    name: '强化船体',
    description: '解锁舰船配件：强化船体（+2 装甲值）。',
  },
  positron_computer: {
    name: '正电子计算机',
    description: '解锁舰船配件：正电子计算机（命中 +2，先攻 +1，耗能 1）。',
  },
  advanced_economy: {
    name: '高级经济学',
    description: '允许在带有星标的进阶信用点行星上殖民。',
  },
  tachyon_drive: {
    name: '超光速引擎',
    description: '解锁舰船配件：超光速引擎（航速 3，先攻 +3，耗能 3）。',
  },
  antimatter_cannon: {
    name: '反物质加农炮',
    description: '解锁舰船配件：反物质加农炮（1 颗红骰，每命中 4 伤害，耗能 4）。',
  },
  quantum_grid: {
    name: '量子网格',
    description: '立即获得 2 枚额外影响力圆片放到影响力轨上。',
  },
  neutron_bombs: {
    name: '中子炸弹',
    description: '对无防御敌方行星轰炸时无需掷骰即可摧毁全部人口方块。',
  },
  starbase: {
    name: '星际基地',
    description: '允许在建造阶段在自己控制的星区建造星际基地（最高先攻 +4，+2 装甲）。',
  },
  plasma_cannon: {
    name: '等离子加农炮',
    description: '解锁舰船配件：等离子加农炮（1 颗橙骰，每命中 2 伤害，耗能 2）。',
  },
  phase_shield: {
    name: '相位护盾',
    description: '解锁舰船配件：相位护盾（使敌方命中检定 -2，耗能 1）。',
  },
  advanced_mining: {
    name: '高级采矿术',
    description: '允许在带有星标的进阶材料行星上殖民。',
  },
  tachyon_source: {
    name: '超光速能源',
    description: '解锁舰船配件：超光速能源（提供 +9 能量）。',
  },
  gluon_computer: {
    name: '胶子计算机',
    description: '解锁舰船配件：胶子计算机（命中 +3，先攻 +2，耗能 2）。',
  },
  plasma_missile: {
    name: '等离子导弹',
    description: '解锁舰船配件：等离子导弹（开火前发射 2 颗橙骰导弹，耗能 1）。',
  },
  antimatter_splitter: {
    name: '反物质分裂器',
    description: '加农炮造成的单颗红/多点伤害骰可自由拆分分配给多个合法目标。',
  },
  neutron_absorber: {
    name: '中子吸收器',
    description: '使敌方【中子炸弹】对己方行星轰炸时必须正常掷骰生效。',
  },
  conifold_field: {
    name: '锥形力场',
    description: '解锁舰船配件：锥形力场（+3 装甲值，耗能 2）。',
  },
  absorption_shield: {
    name: '吸收护盾',
    description: '解锁舰船配件：吸收护盾（敌方命中 -1 且提供 +4 能量）。',
  },
  cloaking_device: {
    name: '隐形装置',
    description: '允许舰船压制或绕过含少量敌舰的非阻塞星区。',
  },
  improved_logistics: {
    name: '高效后勤',
    description: '每次【移动】行动可进行 +1 次额外舰船移动激活。',
  },
  sentient_hull: {
    name: '智能船体',
    description: '解锁舰船配件：智能船体（+1 装甲，命中 +1）。',
  },
  soliton_cannon: {
    name: '孤子加农炮',
    description: '解锁舰船配件：孤子加农炮（1 颗蓝骰，每命中 3 伤害，耗能 3）。',
  },
  transition_drive: {
    name: '跃迁引擎',
    description: '解锁舰船配件：跃迁引擎（航速 3，无耗能）。',
  },
  warp_portal: {
    name: '曲速传送门',
    description: '立即在自己控制的一个星区放置曲速传送门，使所有传送门星区互相视为相邻。',
  },
  flux_missile: {
    name: '通量导弹',
    description: '解锁舰船配件：通量导弹（2 颗黄骰导弹，先攻 +1，无耗能）。',
  },
  pico_modulator: {
    name: '皮米调节器',
    description: '每次【升级】行动可额外安装 +2 个舰船配件。',
  },
  ancient_labs: {
    name: '远古实验室',
    description: '立即免费抽取并检视探索发现板块。',
  },
  zero_point_source: {
    name: '零点能源核心',
    description: '解锁舰船配件：零点能源核心（提供 +12 能量）。',
  },
  metasynthesis: {
    name: '超合成技术',
    description: '可殖民任意类型的进阶行星（信用点、科研、材料皆可）。',
  },
  rift_cannon: {
    name: '裂隙加农炮',
    description: '解锁舰船配件：裂隙加农炮（1 颗紫骰，无视护盾与计算机，可能造成自伤）。',
  },
};

const PART_ZH: Record<string, string> = {
  nuclear_source: '核能核心',
  fusion_source: '聚变反应堆',
  tachyon_source: '超光速能源',
  zero_point_source: '零点能源核心',
  hypergrid_source: '超网格能源',
  muon_source: 'μ子能源 (槽外)',
  nuclear_drive: '核能引擎',
  fusion_drive: '聚变引擎',
  tachyon_drive: '超光速引擎',
  conformal_drive: '保形引擎',
  nonlinear_drive: '非线性引擎',
  transition_drive: '跃迁引擎',
  jump_drive: '跳跃引擎',
  electron_computer: '电子计算机',
  positron_computer: '正电子计算机',
  gluon_computer: '胶子计算机',
  axion_computer: '轴子计算机',
  gauss_shield: '高斯护盾',
  phase_shield: '相位护盾',
  flux_shield: '通量护盾',
  inversion_shield: '反演护盾',
  absorption_shield: '吸收护盾',
  morph_shield: '变形护盾',
  hull: '基础船体',
  improved_hull: '强化船体',
  conifold_field: '锥形力场',
  shard_hull: '碎片船体',
  sentient_hull: '智能船体',
  ion_cannon: '离子加农炮',
  plasma_cannon: '等离子加农炮',
  soliton_cannon: '孤子加农炮',
  antimatter_cannon: '反物质加农炮',
  rift_cannon: '裂隙加农炮',
  rift_conductor: '裂隙传导器',
  ion_disruptor: '离子干扰炮',
  ion_turret: '离子炮塔',
  plasma_turret: '等离子炮塔',
  soliton_charger: '孤子充能炮',
  ion_missile: '离子导弹',
  plasma_missile: '等离子导弹',
  flux_missile: '通量导弹',
  soliton_missile: '孤子导弹',
  antimatter_missile: '反物质导弹',
};

const FACTION_ZH: Record<string, { name: string; trait?: string }> = {
  terran_federation: { name: '地球联邦 (人族)', trait: '均衡起始经济、探索与 2:1 贸易比率。' },
  terran_directorate: { name: '地球督导部 (人族)' },
  terran_republic: { name: '地球共和国 (人族)' },
  terran_conglomerate: { name: '地球财团 (人族)' },
  terran_union: { name: '地球联盟 (人族)' },
  terran_alliance: { name: '地球同盟 (人族)' },
  eridani_empire: { name: '埃里达尼帝国', trait: '起始 26 信用点、2 个随机发现板块，少 2 枚影响力圆片。' },
  hydran_progress: { name: '海德拉学者', trait: '极强科研能力（研究行动 2 次，起始进阶科研星）。' },
  planta: { name: '植物种族', trait: '每探索行动可翻 2 个星区，星区终局额外 +1 VP，但船只脆弱。' },
  descendants_of_draco: { name: '德拉科后裔', trait: '与远古舰和平共处，无法攻打远古舰，但每个未摧毁远古舰星区终局 +1 VP。' },
  mechanema: { name: '机械种族', trait: '造价低廉，每次升级/建造效率更高。' },
  orion_hegemony: { name: '猎户座霸权', trait: '起始即拥有巡洋舰与高斯护盾，全部战舰自带额外能量与先攻加成。' },
  wardens_of_magellan: { name: '麦哲伦守望者', trait: '遗迹猎手：16 枚圆片，起始聚变能源，游戏结束每件远古配件 +1 VP。' },
  enlightened_of_lyra: { name: '天琴座悟道者', trait: '起始带神社建筑，探索或外交后可建神社获取大量终局 VP。' },
  the_exiles: { name: '流亡者', trait: '不可建造星际基地，以带武装的强化轨道站替代星际基地防卫领地。' },
  rho_indi_syndicate: { name: '罗印第辛迪加', trait: '不可建造无畏舰，自带闪避护盾，大使位更少但机动灵活。' },
  atlantians: {
    name: '亚特兰蒂斯人 (Atlantians)',
    trait: '起始拥有远古实验室科技，获取探索发现板块时双抽选一（排除+6材料与远古巡洋舰），研发后可免费升级 1 个该科技解锁配件；舰船上每件发现配件终局 +1 VP，且同船型第 2 件起建造多耗 +1 材料。',
  },
  mega_war_inc: {
    name: '巨战公司 (Mega War Inc.)',
    trait: '人类起源商业军工巨头：3 材料/3 科研/2 金钱开局；模块化联动蓝图（每次升级 1 格同步影响联动船型）；建造时可用 3 材料将任意星区（含敌方/牵制星区）的拦截舰升巡洋舰或巡洋舰升无畏舰；定制军事与 6 格纳米科技轨；禁用方尖碑且不可立即装配发现配件。',
  },
  remnants_of_ra: {
    name: '拉之余晖 (Remnants of Ra)',
    trait: '先祖力场（Power of the Ancients）：在所有带遗物钥匙（Artifact）的受控星区（含母星 255 号奥西里斯赛特）额外获得 1 个可放置任意种类人口方块的万能槽位；先祖秘辛（Secrets of the Ancients）：终局每个受控遗物星区额外 +1 VP。开局自带等离子加农炮与标准蓝图，4:1 贸易，影响力每次仅翻正 1 艘殖民船。',
  },
};

const EXPANSION_ZH: Record<string, { name: string; shortName: string }> = {
  rift_cannon: { name: '裂隙加农炮', shortName: '裂隙炮' },
  remnants_of_worlds_afar: { name: '遥远世界的遗迹 (Remnants)', shortName: '遗迹扩展' },
  turn_order: { name: '行动顺位变体', shortName: '顺位变体' },
  seekers: { name: '探索者扩展 (Seekers)', shortName: '探索者' },
  outcasts: { name: '放逐者扩展 (Outcasts)', shortName: '放逐者' },
  minor_species: { name: '次要种族大使', shortName: '次要种族' },
  warped_universe: { name: '曲率宇宙图板', shortName: '曲率宇宙' },
  galactic_events: { name: '银河事件', shortName: '银河事件' },
  community_balance: { name: '社区平衡补丁', shortName: '平衡补丁' },
  community_factions: { name: '社区扩展种族 (Community Factions)', shortName: '社区种族' },
};

const MINOR_SPECIES_ZH: Record<string, string> = {
  minor_species_reputation_vp: '声望公会',
  minor_species_ambassador_vp: '外交飞地',
  minor_species_flat_vp: '远古显贵',
  minor_species_population_cube: '殖民先驱',
  minor_species_cruiser_discount: '巡洋舰工坊',
  minor_species_dreadnought_discount: '无畏舰工程师',
  minor_species_orbital_discount: '轨道建筑师',
  minor_species_monolith_discount: '巨石匠师',
  minor_species_tech_discount: '科研联合体',
};

export function translateShipType(shipType: string, lang: AppLanguage): string {
  if (lang !== 'zh') return shipType;
  return SHIP_TYPE_ZH[shipType.toLowerCase()] || shipType;
}

export function translateResourceType(resource: string, lang: AppLanguage): string {
  if (lang !== 'zh') return resource;
  return RESOURCE_ZH[resource.toLowerCase()] || resource;
}

export function translateGamePhase(phase: string, lang: AppLanguage): string {
  if (lang !== 'zh') return phase.replace('_', ' ');
  return PHASE_ZH[phase] || PHASE_ZH[phase.toLowerCase()] || phase.replace('_', ' ');
}

export function translateTechCategory(category: string, lang: AppLanguage): string {
  if (lang !== 'zh') return category;
  return TECH_CATEGORY_ZH[category] || category;
}

export function translateTechName(id: string, fallback: string, lang: AppLanguage): string {
  if (lang !== 'zh') return fallback;
  return TECH_ZH[id]?.name || fallback;
}

export function translateTechDesc(id: string, fallback: string, lang: AppLanguage): string {
  if (lang !== 'zh') return fallback;
  return TECH_ZH[id]?.description || fallback;
}

export function translatePartName(id: string, fallback: string, lang: AppLanguage): string {
  if (lang !== 'zh') return fallback;
  if (PART_ZH[id]) return PART_ZH[id];
  if (id.includes('_comp_')) return fallback.replace('Computer', '计算机');
  if (id.includes('_shield_')) return fallback.replace('Shield', '护盾');
  if (id.includes('_hull_')) return fallback.replace('Improved Hull', '强化船体').replace('Hull', '船体');
  if (id.includes('_weapon_')) {
    return fallback
      .replace('Yellow', '黄骰')
      .replace('Orange', '橙骰')
      .replace('Blue', '蓝骰')
      .replace('Red', '红骰')
      .replace('Missile', '导弹')
      .replace('Cannon', '加农炮');
  }
  return fallback;
}

export function translateFactionName(id: string, fallback: string, lang: AppLanguage): string {
  if (lang !== 'zh') return fallback;
  return FACTION_ZH[id]?.name || fallback;
}

export function translateFactionTrait(id: string, fallback: string, lang: AppLanguage): string {
  if (lang !== 'zh') return fallback;
  return FACTION_ZH[id]?.trait || fallback;
}

export function translateExpansionName(id: string, fallback: string, lang: AppLanguage): string {
  if (lang !== 'zh') return fallback;
  return EXPANSION_ZH[id]?.name || fallback;
}

export function translateExpansionShortName(id: string, fallback: string, lang: AppLanguage): string {
  if (lang !== 'zh') return fallback;
  return EXPANSION_ZH[id]?.shortName || fallback;
}

export function translateMinorSpeciesName(id: string, fallback: string, lang: AppLanguage): string {
  if (lang !== 'zh') return fallback;
  return MINOR_SPECIES_ZH[id] || fallback;
}

export function translateNeutralBlueprintTitle(type: string, variant: string, fallback: string, lang: AppLanguage): string {
  if (lang !== 'zh') return fallback;
  const baseName =
    type === 'ancient' ? '远古舰' : type === 'guardian' ? '守护者' : '银河中心防御系统 (GCDS)';
  const varLabel = variant === 'advanced' ? ' (进阶)' : variant === 'expert' ? ' (遗迹)' : '';
  return `${baseName}${varLabel}`;
}

const DIE_COLOR_ZH: Record<string, string> = {
  yellow: '黄',
  orange: '橙',
  blue: '蓝',
  red: '红',
  purple: '紫',
};

/**
 * Formats an NPC blueprint summary (hull, initiative, weapons/missiles, computer, shield) in EN or ZH.
 */
export function translateNeutralBlueprintSummary(
  bp: {
    type: string;
    variant: string;
    name: string;
    initiative: number;
    maxHull: number;
    computerBonus: number;
    shieldBonus: number;
    weapons: Array<{ color: string; damage: number; count: number; isMissile?: boolean }>;
    summary: string;
  },
  lang: AppLanguage
): string {
  if (lang !== 'zh') return bp.summary;
  const title = translateNeutralBlueprintTitle(bp.type, bp.variant, bp.name, lang);
  const weaponStr = bp.weapons
    .map((w) => `${w.count} ${DIE_COLOR_ZH[w.color] || w.color}${w.isMissile ? '导弹' : '加农炮'}`)
    .join('、');
  const mods: string[] = [];
  if (bp.computerBonus > 0) mods.push(`命中 +${bp.computerBonus}`);
  if (bp.shieldBonus > 0) mods.push(`护盾 -${bp.shieldBonus}`);
  const modStr = mods.length > 0 ? `（${mods.join('，')}）` : '';
  return `${title}：船体 ${bp.maxHull} • 先攻 ${bp.initiative}${weaponStr ? ` • ${weaponStr}` : ''}${modStr}`;
}
