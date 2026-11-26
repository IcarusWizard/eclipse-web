import { FactionInfo, ReputationSlotType } from '../types/player';
import { SectorTile } from '../types/galaxy';
import { getFactionReputationSlotTypes } from './setup';
import { ALL_HOME_SECTORS, HUMAN_HOME_SECTORS } from './sectorData';
import {
  calculateBlueprintStats,
  createDefaultHumanBlueprints,
  createFactionBlueprints,
} from './shipValidation';

export type FactionRuleIcon =
  | 'rep'
  | 'disc'
  | 'ship'
  | 'tech'
  | 'vp'
  | 'trade'
  | 'explore'
  | 'colony'
  | 'shrine'
  | 'warning';

export interface FactionRuleEntry {
  id: string;
  icon: FactionRuleIcon;
  en: string;
  zh: string;
}

export interface FactionStartingShipInfo {
  shipType: 'interceptor' | 'cruiser' | 'dreadnought' | 'starbase' | 'orbital';
  count: number;
}

export interface FactionBlueprintBadge {
  en: string;
  zh: string;
  tone: 'positive' | 'negative' | 'neutral';
}

export interface FactionBlueprintModifier {
  shipType: 'interceptor' | 'cruiser' | 'dreadnought' | 'starbase' | 'orbital';
  badges: FactionBlueprintBadge[];
}

export interface FactionSheetMetadata {
  historyEn: string;
  historyZh: string;
  portraitUrl?: string;
  startingShips: FactionStartingShipInfo[];
  rules: FactionRuleEntry[];
}

export interface FactionSheetData {
  faction: FactionInfo;
  portraitUrl: string;
  historyEn: string;
  historyZh: string;
  activations: {
    explore: number;
    research: number;
    upgrade: number;
    build: number;
    move: number;
    influence: number;
  };
  startingShips: FactionStartingShipInfo[];
  homeSector: Partial<SectorTile>;
  reputationSlotTypes: ReputationSlotType[];
  rules: FactionRuleEntry[];
  blueprintModifiers: FactionBlueprintModifier[];
}

const FACTION_PORTRAIT_URLS: Record<string, string> = {
  eridani_empire: '/factions/eridani_empire.jpg',
  hydran_progress: '/factions/hydran_progress.jpg',
  planta: '/factions/planta.jpg',
  descendants_of_draco: '/factions/descendants_of_draco.jpg',
  mechanema: '/factions/mechanema.jpg',
  orion_hegemony: '/factions/orion_hegemony.jpg',
  wardens_of_magellan: '/factions/wardens_of_magellan.jpg',
  enlightened_of_lyra: '/factions/enlightened_of_lyra.jpg',
  the_exiles: '/factions/the_exiles.jpg',
  rho_indi_syndicate: '/factions/rho_indi_syndicate.jpg',
  atlantians: '/factions/atlantians.jpg',
  mega_war_inc: '/factions/mega_war_inc.jpg',
  remnants_of_ra: '/factions/remnants_of_ra.jpg',
  the_horde: '/factions/the_horde.jpg',
  the_spiral: '/factions/the_spiral.jpg',
  legion_of_midas: '/factions/legion_of_midas.jpg',
  heralds_of_ragnarok: '/factions/heralds_of_ragnarok.jpg',
};

const FACTION_SHEET_META: Record<string, FactionSheetMetadata> = {
  eridani_empire: {
    historyEn:
      'Once unrivaled masters of the Epsilon Eridani throne worlds, the veiled dynasty poured vast star-forged wealth into orbital monuments before the Silent Era shattered their core. Though their vaults are diminished and noble houses thinned, the remaining heirs still command old-world treasuries and superior reactor doctrines as they march back into uncharted space.',
    historyZh:
      '曾统治天苑四核心星域的戴面纱皇朝，在“静默纪元”崩解前夕积累了骇人听闻的星海财富与奇观。尽管帝国疆域化作废墟、贵族影响力大减，幸存的继承人仍握有充裕的古帝国金库与更高阶的舰船能源技术，正试图在未探星域中重燃昔日荣光。',
    portraitUrl: '/factions/eridani_empire.jpg',
    startingShips: [{ shipType: 'interceptor', count: 1 }],
    rules: [
      {
        id: 'eridani_rep',
        icon: 'rep',
        en: 'Draw 2 random Reputation Tiles at game setup and place them facedown on your Reputation Track.',
        zh: '开局时随机抽取 2 枚声望板块，面朝下置入你的声望轨。',
      },
      {
        id: 'eridani_discs',
        icon: 'disc',
        en: 'Start with 2 fewer Influence Discs (11 total discs instead of 13; leave two leftmost track spaces empty).',
        zh: '初始少 2 枚影响力圆片（共 11 枚而非 13 枚，保留最左侧两个轨位为空）。',
      },
      {
        id: 'eridani_start_resources',
        icon: 'colony',
        en: 'Begin with 26 Money treasury and 3 starting technologies: Gauss Shield, Fusion Drive, Plasma Cannon.',
        zh: '开局拥有 26 信用点庞大金库，以及高斯护盾、聚变推进器、等离子加农炮三项起始科技。',
      },
    ],
  },
  hydran_progress: {
    historyEn:
      'Emerging from the abyssal oceans of Beta Hydri, these luminescent scholars treat computation and astrophysics as sacred art. Their floating neural academies dissect alien relics within cycles, enabling double-threaded research breakthroughs that leave slower organic empires trailing behind.',
    historyZh:
      '诞生于蛇夫座β深海的研究学者们将高维演算与天体物理视作最高信仰。其浮空神经学院能同时推进两条科研脉络，借助进阶科研行星的算力优势，以远超其他星际文明的速度解锁银河高阶科技。',
    portraitUrl: '/factions/hydran_progress.jpg',
    startingShips: [{ shipType: 'interceptor', count: 1 }],
    rules: [
      {
        id: 'hydran_research',
        icon: 'tech',
        en: 'Gain 2 Research activations per Research action instead of 1.',
        zh: '每次执行研究行动可进行 2 次科研激活（常规文明为 1 次）。',
      },
      {
        id: 'hydran_setup_cube',
        icon: 'colony',
        en: 'Begin with Advanced Labs technology and place an extra Population Cube on your starting Advanced Science planet.',
        zh: '开局自带进阶实验室科技，并在母星系进阶科研行星上额外放置 1 枚人口方块。',
      },
      {
        id: 'hydran_amb',
        icon: 'rep',
        en: 'First Reputation Track slot is Ambassador-only; remaining 3 slots accept either Reputation Tiles or Ambassadors.',
        zh: '声望轨第 1 格仅可放置外交大使，其余 3 格可兼放声望板块或大使。',
      },
    ],
  },
  planta: {
    historyEn:
      'A vast botanical superorganism originating in Cygnus, Planta expands through coordinated spore-probes that chart dual warp lanes at once. While their living vessels pack fragile lightweight hulls, every rooted sector feeds a sprawling photosynthetic web that scores steadily at galactic dusk.',
    historyZh:
      '起源于天鹅座的星海植物超有机体，通过协同孢子探测器同时开辟两条未知星道。虽然由藤蔓与能量胞构建的舰船船体相对脆弱，但每一处扎根并受控的星区都会为终局编织稳定的分值网络。',
    portraitUrl: '/factions/planta.jpg',
    startingShips: [{ shipType: 'interceptor', count: 1 }],
    rules: [
      {
        id: 'planta_explore',
        icon: 'explore',
        en: 'Gain 2 Explore activations per Explore action instead of 1.',
        zh: '每次执行探索行动可进行 2 次探索激活，每回合扩张效率翻倍。',
      },
      {
        id: 'planta_vp',
        icon: 'vp',
        en: 'Score +1 extra Victory Point for each controlled sector at game end.',
        zh: '游戏结束时，每个由你控制的星区额外获得 +1 VP。',
      },
      {
        id: 'planta_colony',
        icon: 'colony',
        en: 'Start with 4 Colony Ships (instead of 3) and Starbase technology. Planet cubes are automatically destroyed by 1+ cannon damage.',
        zh: '起始拥有 4 艘殖民船及星际基地科技；防守被炮火命中即自动损失行星人口方块。',
      },
    ],
  },
  descendants_of_draco: {
    historyEn:
      'Revered keepers of prehistoric machine-shrines orbiting Draco, this reptilian lineage forged an ancient cipher of non-aggression with automated Guardian cruisers. Their scouts chart two frontiers simultaneously while treating dormant Ancients as silent protectors rather than foes.',
    historyZh:
      '世居天龙座古老机魂神庙旁的龙裔族群，掌握着与远古自律战舰停火共鸣的古老密钥。他们的斥候每次探索可审视两张候选板块并择其一，且可将遍布星海的远古舰化为天然屏障与终局分值。',
    portraitUrl: '/factions/descendants_of_draco.jpg',
    startingShips: [{ shipType: 'interceptor', count: 1 }],
    rules: [
      {
        id: 'draco_ancients',
        icon: 'ship',
        en: 'Peaceful coexistence with Ancients: Ancients never attack or pin your ships, and you cannot attack Ancients.',
        zh: '与远古舰和平共处：远古舰不会攻击或牵制你的舰船，你也不可攻打远古舰。',
      },
      {
        id: 'draco_explore',
        icon: 'explore',
        en: 'During Explore, draw 2 Sector Tiles and choose 1 to place (discarding the other).',
        zh: '每次探索激活抽取 2 张星区板块并选择 1 张放置（弃置另一张）。',
      },
      {
        id: 'draco_vp_tech',
        icon: 'vp',
        en: 'Start with Fusion Drive technology. Score +1 VP at game end for each undefeated Ancient ship remaining on the map.',
        zh: '起始拥有聚变推进器科技；终局时棋盘上每留存 1 艘未被消灭的远古舰为你提供 +1 VP。',
      },
    ],
  },
  mechanema: {
    historyEn:
      'Self-replicating cybernetic artisans forged in Auriga’s automated ring foundries, the Mechanema optimize every shipyard gantry to fraction-millisecond tolerances. Their modular logistics produce warships, orbitals, and monoliths at steep material discounts.',
    historyZh:
      '诞生于御夫座自动化环形铸造厂的智械工匠群落，将舰船装配线与模块重构压缩至极限效率。无论是战舰舰体、星际基地还是轨道巨石，机械种族均享有高额材料造价折扣与更高的升级/建造激活上限。',
    portraitUrl: '/factions/mechanema.jpg',
    startingShips: [{ shipType: 'interceptor', count: 1 }],
    rules: [
      {
        id: 'mech_acts',
        icon: 'ship',
        en: 'Gain 3 Upgrade and 3 Build activations per action (instead of 2 each).',
        zh: '每次升级与建造行动均拥有 3 次激活（常规文明为 2 次）。',
      },
      {
        id: 'mech_discount',
        icon: 'colony',
        en: 'Reduced Material build costs: Interceptor 2, Cruiser 4, Dreadnought 7, Starbase 2, Orbital 3, Monolith 8.',
        zh: '全线建造材料减免：拦截舰 2、巡洋舰 4、无畏舰 7、星际基地 2、轨道站 3、巨石 8。',
      },
      {
        id: 'mech_tech',
        icon: 'tech',
        en: 'Begin with Positron Computer technology (+2 Computer accuracy unlocked from turn 1).',
        zh: '开局自带正电子计算机科技，首回合即可强化舰队命中电脑配件。',
      },
    ],
  },
  orion_hegemony: {
    historyEn:
      'From the austere obsidian citadels of Rigel rises a predatory martial empire bred for first-strike supremacy. Every Orion hull carries oversized auxiliary reactors and boosted targeting computers, launching a hardened Cruiser straight from turn one.',
    historyZh:
      '崛起于参宿七黑曜石要塞的好战霸权，一切社会体系皆围绕星际突袭与舰队先攻打造。所有猎户座战舰均内置额外先攻与能源输出，开局即派出一艘装备高斯护盾的巡洋舰巡弋星区。',
    portraitUrl: '/factions/orion_hegemony.jpg',
    startingShips: [{ shipType: 'cruiser', count: 1 }],
    rules: [
      {
        id: 'orion_cruiser',
        icon: 'ship',
        en: 'Begin with 1 Cruiser (instead of 1 Interceptor) and start with Neutron Bombs & Gauss Shield.',
        zh: '开局拥有 1 艘巡洋舰（而非拦截舰），并自带中子炸弹与高斯护盾科技。',
      },
      {
        id: 'orion_trade_rep',
        icon: 'trade',
        en: 'Trade Value is 4:1. Reputation Track holds 5 slots (slot 5 is Reputation Tile only).',
        zh: '贸易比率为 4:1；声望轨共有 5 格（第 5 格仅限放置声望板块）。',
      },
      {
        id: 'orion_combat',
        icon: 'vp',
        en: 'All ships have +1 base Initiative and bonus preprinted Energy (+1 Interceptor, +2 Cruiser, +3 Dreadnought, +3 Starbase).',
        zh: '全舰种基础先攻 +1，且自带更高内置能源（拦截舰+1、巡洋舰+2、无畏舰+3、基地+3）。',
      },
    ],
  },
  wardens_of_magellan: {
    historyEn:
      'Chroniclers and relic-divers patrolling the Magellanic currents, these cloaked wardens view ancient technology not as spoils of war, but as living keys to cosmic history. They strip idle colony fleets into raw fuel and mount recovered discoveries directly onto warship hulls.',
    historyZh:
      '穿梭于麦哲伦星流的遗迹猎手与文明档案官，对古文明造物有着近乎本能的洞察。他们可随时将闲置殖民船拆解为紧缺资源，并在科技树推进至第四格时唤醒隐藏的深空发现。',
    portraitUrl: '/factions/wardens_of_magellan.jpg',
    startingShips: [{ shipType: 'interceptor', count: 1 }],
    rules: [
      {
        id: 'mag_convert',
        icon: 'colony',
        en: 'Colony Ship Conversion: Discard or exhaust colony capacity anytime for 1 Money/Science/Material.',
        zh: '殖民船转换：随时可将就绪殖民船转换为 1 单位信用点、科研或材料资源。',
      },
      {
        id: 'mag_tech_disc',
        icon: 'tech',
        en: 'Starts with Fusion Source & a facedown Tech Track Discovery Tile (unlocked once 4 techs occupy a single track). Only 1 Colony Ship refreshes per Influence.',
        zh: '起始带聚变能源与 1 枚科技轨发现板块（任意单轨满 4 项科技即触发解析）；每次影响力行动仅刷新 1 艘殖民船。',
      },
      {
        id: 'mag_vp',
        icon: 'vp',
        en: 'Start with 16 Influence Discs (3 extra in tray). Score +1 VP per Discovery Tile installed as a Ship Part.',
        zh: '总共拥有 16 枚影响力圆片（托盘额外 3 枚）；终局每件充当舰船配件的发现板块额外 +1 VP。',
      },
    ],
  },
  enlightened_of_lyra: {
    historyEn:
      'Centered beneath the twin suns of Beta Lyrae, these austere mystics construct geometric orbital shrines whose resonance bends warp geometry and steadies gunners’ hands in battle. Pilgrims revere every finished triad on their sacred matrix.',
    historyZh:
      '栖居于天琴座β双星辉光下的星海修士，以精密的九宫神社阵与星图共鸣引导文明觉醒。每座矗立在行星轨道上的神龛皆可引导骰子重掷命运，并在集齐神龛阵列时解锁虫洞跃迁与古代遗珍。',
    portraitUrl: '/factions/enlightened_of_lyra.jpg',
    startingShips: [{ shipType: 'interceptor', count: 1 }],
    rules: [
      {
        id: 'lyra_shrine',
        icon: 'shrine',
        en: '3×3 Shrine Board: Place Shrines during Research/Influence on planets; completing rows unlocks +1 Disc, Discovery Tile, and Wormhole Generator ability.',
        zh: '3×3 神龛面板：研究与影响力期间可建造行星神龛，集齐整行分别解锁 +1 圆片、探索发现与虫洞发生器能力。',
      },
      {
        id: 'lyra_reroll',
        icon: 'ship',
        en: 'Combat Rerolls: Spend ready Colony Ships (up to 1 reroll per Shrine built) to reroll dice in combat and bombardment.',
        zh: '神龛战斗重掷：每回合战斗/轰炸阶段消耗就绪殖民船重掷骰子（次数受已建神龛数协同加成）。',
      },
      {
        id: 'lyra_vp',
        icon: 'vp',
        en: 'Start with Fusion Source & 17 total Influence Discs (4 extra in tray). Score +1 VP per controlled Shrine.',
        zh: '起始聚变能源与共 17 枚圆片（托盘额外 4 枚）；终局每个受控神龛 +1 VP。',
      },
    ],
  },
  the_exiles: {
    historyEn:
      'Cast adrift across the Outer Rim after abandoning grounded biosphere politics, The Exiles engineered self-contained city-rings outfitted with turret batteries and cloaking emitters. Rather than fixed starbases, their armed Orbitals shelter citizens and project firepower alike.',
    historyZh:
      '告别地表疆土、常年漂泊于外缘星带的轨道游民，擅长在模块化太空环城上加装炮塔与隐身立场。他们不建造传统星际基地，而是将带人口的武装轨道站变为坚不可摧的星域要塞。',
    portraitUrl: '/factions/the_exiles.jpg',
    startingShips: [
      { shipType: 'interceptor', count: 1 },
      { shipType: 'orbital', count: 1 },
    ],
    rules: [
      {
        id: 'exiles_orbital',
        icon: 'ship',
        en: 'Armed Orbitals: Start with 1 Interceptor & 1 armed Orbital (3 blueprint slots, +2 Hull & +4 Power preprinted; build cost 5). Cannot build Starbases.',
        zh: '武装轨道站：起始 1 拦截舰 + 1 武装轨道站（3 槽位蓝图，自带 2 船体与 4 能源，造价 5）；无法建造星际基地。',
      },
      {
        id: 'exiles_tech',
        icon: 'tech',
        en: 'Start with Orbital & Cloaking Device technologies (Cloaking counts on Military track), plus 16 total Influence Discs.',
        zh: '开局拥有轨道站与隐身装置科技（计入军事科技轨），总共拥有 16 枚影响力圆片。',
      },
      {
        id: 'exiles_vp_rep',
        icon: 'vp',
        en: 'Score +1 VP per Orbital holding your Population Cube. 4 Reputation Track slots (3 Both, 1 Reputation only).',
        zh: '终局每个有你人口方块的轨道站额外 +1 VP；声望轨 4 格（3 格兼任，第 4 格仅限声望）。',
      },
    ],
  },
  rho_indi_syndicate: {
    historyEn:
      'Operating from the scarred badlands of Sector 236, this ruthless corsair cartel rejects bloated dreadnoughts in favor of nimble cloaked interceptor packs. Immune to the stigma of betrayal, Rho Indi collects bounties for every hull shattered in battle.',
    historyZh:
      '盘踞在荒芜的 236 号星区的星海私掠辛迪加，蔑视笨重无畏舰而崇尚四动高频袭扰与护盾拦截战术。外交盟约于他们不过交易筹码——无视背叛惩罚，每击沉敌舰抽取声望更可斩获丰厚黑市赏金。',
    portraitUrl: '/factions/rho_indi_syndicate.jpg',
    startingShips: [{ shipType: 'interceptor', count: 2 }],
    rules: [
      {
        id: 'rho_fleet',
        icon: 'ship',
        en: 'Raider Swarm: Gain 4 Move activations per action, start with 2 Interceptors, Starbase & Gauss Shield tech, and +1 Initiative/+1 Shield (+1 cost). Cannot build Dreadnoughts.',
        zh: '突袭舰群：每次移动拥有 4 次激活；开局 2 艘拦截舰，自带基地与高斯护盾；战舰自带 +1 先攻/+1 护盾（造价 +1），无法建造无畏舰。',
      },
      {
        id: 'rho_trade_bounty',
        icon: 'trade',
        en: 'Syndicate Economy: Trade 3 Money for 2 of another resource (3:1 otherwise). Gain +1 Money per extra Reputation Tile drawn from kills. Immune to Traitor -2 VP.',
        zh: '辛迪加经济：3 信用点可换 2 其他资源（其余 3:1）；摧毁敌舰多抽声望每张额外获 +1 金；免疫背叛者 -2 VP 惩罚。',
      },
      {
        id: 'rho_rep',
        icon: 'rep',
        en: '5 Reputation Track slots, but only 2 accept Ambassadors (slots 3–5 are Reputation Tile only); 2 Colony Ships; 16 total Influence Discs.',
        zh: '声望轨 5 格，其中仅前 2 格可派驻大使（3-5 格仅限声望）；起始 2 艘殖民船，共 16 枚圆片。',
      },
    ],
  },
  atlantians: {
    historyEn:
      'The Atlantians were the first super-galactic empire, bringing trade and prosperity to their arm of the galaxy until an endless war with the Empire of Ra unleashed the Scrabs—an unstoppable swarm that shattered their civilization within a decade. Six centuries later, the Atlantians have resurfaced to reclaim their ancient secrets and enact vengeance.',
    historyZh:
      '亚特兰蒂斯人曾是银河最早的超级帝国，直到与拉之帝国漫长拉锯中“圣甲虫”灾难爆发，令帝国在十年内湮灭。历经六百载沉寂后，亚特兰蒂斯重返星海，誓要夺回远古秘宝并清算旧日血仇。',
    portraitUrl: '/factions/atlantians.jpg',
    startingShips: [{ shipType: 'interceptor', count: 1 }],
    rules: [
      {
        id: 'atlantians_spirit',
        icon: 'explore',
        en: "Ancient Spirit: When you get a discovery tile (including starting Ancient Labs), draw an additional tile and select which tile to resolve. Discard & redraw any '+6 Materials' or 'Ancient Cruiser' tile (repeat as necessary).",
        zh: '远古之灵：每当获得探索发现板块（含起始远古实验室）时，额外多抽 1 张并选择其中 1 张结算；若抽到「+6 材料」或「远古巡洋舰」，则弃置并重抽直到不再出现。',
      },
      {
        id: 'atlantians_instinct',
        icon: 'tech',
        en: 'Ancient Instinct: Whenever you perform a Research action, you may perform an Upgrade 1 action using the technology researched.',
        zh: '远古本能：每当你执行研究行动时，可免费使用本次研发的科技执行 1 次「升级 1」行动。',
      },
      {
        id: 'atlantians_power',
        icon: 'vp',
        en: 'Ancient Power: Score +1 VP at game end for each Discovery Tile placed on a ship blueprint.',
        zh: '远古之力：终局时，舰船蓝图上每镶嵌 1 个发现板块配件额外获得 +1 VP。',
      },
      {
        id: 'atlantians_price',
        icon: 'warning',
        en: 'Price of Power: +1 Material cost to build each ship class for each Discovery Tile beyond the first placed on that ship class (e.g., 2 tiles = +1 Mat, 3 tiles = +2 Mats).',
        zh: '代价与力量：同一舰船蓝图上从第 2 件发现板块配件起，每多 1 件使该船型建造费用 +1 材料（例：2 件 +1 材料，3 件 +2 材料）。',
      },
    ],
  },
  mega_war_inc: {
    historyEn:
      'Born from Mega Omni Incorporated’s pivot into interstellar defense, this ruthless Terran defense conglomerate annexed its indebted former clients and fielded a standardized modular warship line. Where wars erupt, Mega War Inc. fights directly for the spoils.',
    historyZh:
      '脱胎自跨星际财团巨型全能公司的军工部门，巨战公司在吞并无力偿债的前人族盟友星球后，依托全舰队标准化模块化流水线，直接以武装股东身份介入银河每一场冲突收割战利品。',
    portraitUrl: '/factions/mega_war_inc.jpg',
    startingShips: [{ shipType: 'interceptor', count: 1 }],
    rules: [
      {
        id: 'megawar_home_resources',
        icon: 'colony',
        en: 'Terran Template Setup: Claim any unused Terran homeworld sector (221–226), start with 3 Materials, 3 Science, 2 Money, 3 Colony Ships, 2:1 Trade Value, 3 Move activations, and Terran 5-slot Reputation Track.',
        zh: '人类衍生开局：占据任意未使用的地球母星系（221–226），起始 3 材料 / 3 科研 / 2 金钱 / 3 殖民船、2:1 贸易、3 次移动及人类 5 格声望轨。',
      },
      {
        id: 'megawar_modular',
        icon: 'ship',
        en: 'Modular Blueprints (1 Upgrade/Action): Cruiser shares Interceptor’s 4 slots (+2), Dreadnought shares Cruiser’s 6 slots (+2), and Starbase shares Dreadnought slots 7–8 (+3). Energy & Drive legality must hold across all linked classes (Interceptor Cost 2, Init 1; Dreadnought Init 2).',
        zh: '模块化蓝图（每次仅升级 1 格）：拦截舰 4 格与巡洋舰共享，巡洋舰 6 格与无畏舰共享，无畏舰末 2 格与星际基地共享。任一共享改动须满足所有联动船型合法性（拦截舰造价 2/先攻 1；无畏舰先攻 2）。',
      },
      {
        id: 'megawar_build_upgrade',
        icon: 'ship',
        en: 'Field Hull Upgrade: During Build (1 activation, 3 Materials), upgrade any deployed Interceptor→Cruiser or Cruiser→Dreadnought anywhere on the map—even pinned ships in enemy territory (never downgrade).',
        zh: '战地船体改型：每次建造激活（3 材料）可将地图任意处（含被牵制或敌方控制星区）一艘拦截舰升为巡洋舰，或巡洋舰升为无畏舰（不可降级）。',
      },
      {
        id: 'megawar_tech_monolith_disc',
        icon: 'warning',
        en: 'Wartime Tech & Quality Control: Military discounts -1..-8 (7th slot = 6 VP); Nano has 6 slots (0..-6, 6th = 4 VP). Cannot research or build Monoliths (conquered Monoliths still score 3 VP). Ancient ship parts cannot be equipped immediately upon discovery.',
        zh: '战时科研与品控：军事轨起始即享 -1 减免（7 格 6 VP）；纳米轨共 6 格（满轨 4 VP）。不可研发或建造方尖碑（占领他人方尖碑仍计 3 VP）；远古配件必须存入备用库后用升级行动装配。',
      },
    ],
  },
  remnants_of_ra: {
    historyEn:
      'In a long-forgotten past, the undying godlike ruler Ra and his empire spread across the galaxy before vanishing into wasteland after the fall of Aten and the rise of the Scrabs. Now, reformed from their hidden sanctuary of Osiris Seth (Sector 255), the Remnants of Ra have returned to claim their rightful place as masters and shepherds of the cosmos.',
    historyZh:
      '在远古尘封的时代，不死神王拉的帝国曾横跨银河，却在阿顿崩毁与圣甲虫崛起后化作焦土。历经漫长隐匿，拉的后裔于奥西里斯赛特（255 号星区）重整旗鼓，自称“拉之余晖”重返星海，誓要重夺宇宙主宰之位。',
    portraitUrl: '/factions/remnants_of_ra.jpg',
    startingShips: [{ shipType: 'interceptor', count: 1 }],
    rules: [
      {
        id: 'ra_power_of_ancients',
        icon: 'colony',
        en: 'Power of the Ancients: Gain an additional Wild population slot (any resource: Money, Science, or Materials) in every controlled sector with an Artifact key — including your home Sector 255.',
        zh: '先祖力场（Power of the Ancients）：在所有带遗物钥匙（Artifact）的己方控制星区（包括母星 255 号星区）额外获得 1 个可放任意资源方块的万能人口槽位。',
      },
      {
        id: 'ra_secrets_of_ancients',
        icon: 'vp',
        en: 'Secrets of the Ancients: Score +1 bonus VP at game end for each controlled sector containing an Artifact key (including your homeworld).',
        zh: '先祖秘辛（Secrets of the Ancients）：终局计分时，每个带遗物钥匙的己方控制星区（含母星）额外奖励 +1 VP。',
      },
    ],
  },
  the_horde: {
    historyEn:
      'Descending upon unsuspecting sectors via volatile spatial rifts, The Horde have swarmed and conquered every realm in their path. Having consumed their home galaxy, rival clans now raise their banners together at Kassus Gar Rift (Sector 299) to take this galaxy through sheer ferocity and relentless conquest.',
    historyZh:
      '从剧烈震荡的空间裂隙降临未知星域，战吼部落以蛮横狂暴之姿席卷并征服沿途每一个星区。在耗尽母星系的资源后，各路氏族于卡苏斯裂隙（299 号星区）再度升起战旗，誓要以铁血与掠夺统治这片新银河。',
    portraitUrl: '/factions/the_horde.jpg',
    startingShips: [{ shipType: 'interceptor', count: 1 }],
    rules: [
      {
        id: 'horde_built_for_war',
        icon: 'ship',
        en: "Built for War: +1 damage when you hit with an unmodified '6' (burst; does not apply to Rift weapons). Interceptors, Cruisers & Starbases have -1 base initiative (1 / 0 / 3).",
        zh: '生而好战：非裂缝武器骰出自然 6 命中时伤害 +1；拦截舰、巡洋舰与星际基地基础先攻降低（1 / 0 / 3）。',
      },
      {
        id: 'horde_raid',
        icon: 'explore',
        en: 'Raid: Move actions include a free Build 1 activation.',
        zh: '突袭掠夺：每次执行移动行动（MOV 2）额外附带 1 次建造激活。',
      },
      {
        id: 'horde_call_to_arms',
        icon: 'colony',
        en: 'Call to Arms: Gain Materials when your ships are destroyed in a sector you do not control — Interceptor = +1, Cruiser = +2, Dreadnought = +3.',
        zh: '全军备战：当你的战舰在你未控制的星区被摧毁时获得材料补偿（拦截舰 +1、巡洋舰 +2、无畏舰 +3）。',
      },
      {
        id: 'horde_battle_focus',
        icon: 'tech',
        en: 'Battle Focus & Alternative Tech Board: UPG 3 activations must be spent on different ship classes. Each tech row has 4 slots (0, -1, -3, -5 discounts; 1 VP on completion).',
        zh: '专注备战与紧凑科技轨：每次 3 次升级激活必须用于不同船型；每条科技轨仅 4 格（0 / -1 / -3 / -5 减免，满格 1 VP）。',
      },
    ],
  },
  the_spiral: {
    historyEn:
      'Little is known of the true origin of The Spiral, save rumours that millennia ago they unlocked an energy that consumed much of their physical form and remade them as beings of both matter and light. Infinitely adaptable where rigid empires crumble, they now weave neighboring worlds of Spiralis toward a purpose known only to themselves.',
    historyZh:
      '很少有人知晓螺旋一族的真正起源——传闻数千年前他们释放了一种能量，吞噬了大半肉身并将自身重塑为兼具物质与能量的存有。面对僵化帝国的倾颓，小而精锐的螺旋以近乎无限的可塑性适应战局，正围绕螺旋母星逐步编织属于自己的星海蓝图。',
    portraitUrl: '/factions/the_spiral.jpg',
    startingShips: [{ shipType: 'interceptor', count: 1 }],
    rules: [
      {
        id: 'spiral_mind',
        icon: 'tech',
        en: 'Mind (Single Tech Line & Cheapest Tech): Single 7-slot tech line (0, -1, -2, -3 [1 VP], -4, -6 [2 VP], -8 [3/5 VP]) accepting any tray. At setup, take 1 lowest-printed-cost Tech Tile from the tray.',
        zh: '心智（单一科技轨与最低费开局）：仅 1 条 7 格综合科技轨（减免 0/-1/-2/-3/-4/-6/-8，可置入任意色科技）。开局从科技盘免费选取 1 枚印刷费用最低的科技板块。',
      },
      {
        id: 'spiral_body_shift_port',
        icon: 'ship',
        en: 'Body (Shift Port): Each class replaces a computer (Ion Cannon on Interceptor) with a Shift Port. Before combat in each sector, choose Ion Cannon / Basic Computer / Hull (upgrades to Plasma Cannon / Positron Computer / Improved Hull after 5th tech) if power permits. Bombard immediately after combat.',
        zh: '躯体（转换接口 Shift Port）：每型战舰含 1 个不可替换的转换接口。每处星区开战前若能量充足可切换为离子炮/电子电脑/船体（第 5 项科技后升级为等离子炮/正电子电脑/改良船体），战后立即结算行星轰炸。',
      },
      {
        id: 'spiral_trade',
        icon: 'colony',
        en: 'Asymmetric Trade & Homeworld: Trade 2 Science for 1 any resource (Materials / Money at 3:1). Sector 255 Spiralis provides Material, Science, Money, and Advanced Science.',
        zh: '非对称贸易与母星：可用 2 科研兑换 1 任意资源（材料/金钱为 3:1）。255 号螺旋星拥有材料、科研、金钱与高级科研行星。',
      },
    ],
  },
  legion_of_midas: {
    historyEn:
      'Born out of interstellar merchant guilds—trading first goods, then favours, then entire empires—the Legion of Midas commands unmatched galactic wealth. Civilizations flock to their gilded banner, though everything has a price, and the Midas Legion excels at extracting every last ounce of value and turning conquest into pure gold.',
    historyZh:
      '迈达斯军团源自星际商行——最初交易货物，随后交易人情，最终交易整座帝国。他们坐拥全银河无可匹敌的财富；无数文明慕名依附于金甲旗帜之下，然而一切皆有价码，军团擅长榨干每颗星球的价值，并将征服所及尽数化为黄金。',
    portraitUrl: '/factions/legion_of_midas.jpg',
    startingShips: [{ shipType: 'interceptor', count: 1 }],
    rules: [
      {
        id: 'midas_touch',
        icon: 'trade',
        en: 'Midas Touch: BEFORE performing an action, spend Gold for +1 activation (EXP 4, RES 3, UPG 1, BUI 1, MOV 1, INF action disc 1). If ≤7 action discs remain, costs increase by +1 Gold.',
        zh: '点金手（Midas Touch）：在执行行动前，可花费金钱获得 +1 次同类型激活（探索4 / 研发3 / 升级1 / 建造1 / 移动1 / 扩张仅限额外圆片1）；若剩余圆片 ≤7 枚，各项费用 +1 金钱。',
      },
      {
        id: 'money_is_power',
        icon: 'colony',
        en: 'Money Is Power: Begin with Advanced Economy and a starting Population Cube placed in your Advanced Gold square (Sector 277 Phrygia-Giants), alongside your chosen Gray square cube.',
        zh: '金钱即力量：开局自带高阶经济科技，并在母星 277 号星区（Phrygia-Giants）的高级金钱槽预置 1 枚人口方块，同时自选 1 枚方块置入灰色泛用槽。',
      },
      {
        id: 'all_that_glitters',
        icon: 'rep',
        en: 'All That Glitters & Reputation Track: Earn 1 Gold instead of 2 Gold when passing first. 4 Reputation Track slots (Slot 1 is Ambassador-only; Slots 2–4 hold Reputation Tiles or Ambassadors).',
        zh: '闪耀皆有代价：首位跳过仅获得 1 金钱（而非 2 金钱）。声望轨共 4 格（第 1 格仅限大使，第 2-4 格可兼放声望板块或大使）。',
      },
    ],
  },
  heralds_of_ragnarok: {
    historyEn:
      'From days immemorial it was prophesied that Jörmungandr would swallow the world and Ragnarök would follow. When Asgard slipped into a cataclysmic black hole in CY29182, the warlike Asgardians took it as the final omen—mobilizing from Sector 299 Yggdrasil to seek glorious battle against the deadliest foes in the galaxy or die nobly bound for Valhalla.',
    historyZh:
      '自太古预言流传：尘世巨蟒将吞噬世界、诸神黄昏终将降临。在 CY29182 年阿斯加德坠入毁灭黑洞后，好战的阿萨神族将其视为最终预兆，从 299 号星区世界树（Yggdrasil）全军出征，誓与银河最凶险的强敌决一死战，或战死沙场荣归英灵殿。',
    portraitUrl: '/factions/heralds_of_ragnarok.jpg',
    startingShips: [{ shipType: 'cruiser', count: 1 }],
    rules: [
      {
        id: 'ragnarok_raid',
        icon: 'ship',
        en: 'Raid: Move actions include +1 Build activation (stage up to 1 ship or structure before executing your moves; reverting cancels both).',
        zh: '突袭掠夺（Raid）：移动行动额外包含 +1 次建造激活（可在移动前先建造 1 项并一并结算，撤回可同时还原）。',
      },
      {
        id: 'ragnarok_regroup',
        icon: 'ship',
        en: 'Regroup: Build actions include +1 Move activation (after staging up to 2 builds, optionally move 1 ship including newly built vessels).',
        zh: '重整集结（Regroup）：建造行动额外包含 +1 次移动激活（完成至多 2 项建造后，可额外移动 1 艘飞船，包括刚建造的飞船）。',
      },
      {
        id: 'ragnarok_designs',
        icon: 'vp',
        en: 'Alternate Ship Designs & Start: Interceptor costs 4 Mats (5 slots with extra Hull, Initiative +1). Cruiser costs 4 Mats (5 slots without Hull, Initiative +2). Begin with 1 Cruiser in Sector 299 (Yggdrasil).',
        zh: '特制舰船设计与开局：拦截舰造价 4（5 槽含额外船体，先攻 +1）；巡洋舰造价 4（5 槽去船体，先攻 +2）。开局母星 299 号星区配置 1 艘巡洋舰而非拦截舰。',
      },
    ],
  },
};

function buildTerranHistory(faction: FactionInfo): { en: string; zh: string } {
  const sectorLabel = faction.startingSectorNumber;
  return {
    en: `Forged beneath the orbital shipyards of Sol (Sector ${sectorLabel}), the ${faction.name} blends balanced frontier exploration with agile long-range fleet doctrines. ${faction.traitDescription} Supported by flexible five-slot diplomacy and streamlined 2:1 interstellar trade, Terran commanders adapt rapidly to any crisis on the galactic rim.`,
    zh: `诞生于太阳系（${sectorLabel} 号星区）轨道船坞的${faction.name}，兼顾均衡疆域扩张与远航机动舰队学说。依靠 2:1 的高效星际贸易率、每轮 3 次移动激活以及高达 5 格的外交声望体系，人类指挥官在面对银河边缘任何变局时都能从容调度。`,
  };
}

function buildTerranRules(faction: FactionInfo): FactionRuleEntry[] {
  return [
    {
      id: `${faction.id}_move_trade`,
      icon: 'ship',
      en: 'Mobile Doctrine: Gain 3 Move activations per Move action (instead of 2) and efficient 2:1 interstellar Trade.',
      zh: '机动学说：每次移动行动拥有 3 次激活（异星通常为 2 次），贸易比率高达 2:1。',
    },
    {
      id: `${faction.id}_diplomacy`,
      icon: 'rep',
      en: 'Expansive Diplomacy: 5 Reputation Track slots (slot 1 is Ambassador-only; slots 2–5 hold Reputation Tiles or Ambassadors).',
      zh: '广域外交：声望轨多达 5 格（第 1 格仅限外交大使，第 2-5 格可兼放声望板块或大使）。',
    },
    {
      id: `${faction.id}_home`,
      icon: 'colony',
      en: `Rich Home System (Sector ${faction.startingSectorNumber}): 5 habitable planet slots (3 colonized at setup), 3 Colony Ships, 13 Influence Discs, and 1 Interceptor.`,
      zh: `富饶母星系（${faction.startingSectorNumber} 号星区）：包含 5 颗可殖民行星（开局占领 3 颗）、3 艘殖民船、13 枚圆片与 1 艘拦截舰。`,
    },
  ];
}

export function computeFactionBlueprintModifiers(factionId: string): FactionBlueprintModifier[] {
  const baseline = createDefaultHumanBlueprints();
  const factionBps = createFactionBlueprints(factionId);
  const order: ('interceptor' | 'cruiser' | 'dreadnought' | 'starbase' | 'orbital')[] = [
    'interceptor',
    'cruiser',
    'dreadnought',
    'starbase',
    'orbital',
  ];

  const modifiers: FactionBlueprintModifier[] = [];

  for (const shipType of order) {
    const bp = factionBps[shipType];
    if (!bp) {
      if (factionId === 'the_exiles' && shipType === 'starbase') {
        modifiers.push({
          shipType: 'starbase',
          badges: [{ en: 'Cannot Build', zh: '无法建造', tone: 'negative' }],
        });
      } else if (factionId === 'rho_indi_syndicate' && shipType === 'dreadnought') {
        modifiers.push({
          shipType: 'dreadnought',
          badges: [{ en: 'Cannot Build', zh: '无法建造', tone: 'negative' }],
        });
      }
      continue;
    }

    if (shipType === 'orbital') {
      const badges: FactionBlueprintBadge[] = [
        { en: `${bp.maxSlots} Slots`, zh: `${bp.maxSlots} 槽位`, tone: 'neutral' },
        { en: `Cost ${bp.baseBuildCost}`, zh: `造价 ${bp.baseBuildCost}`, tone: 'neutral' },
      ];
      if (bp.preprintedPower) {
        badges.push({ en: `+${bp.preprintedPower} ⚡`, zh: `+${bp.preprintedPower} ⚡`, tone: 'positive' });
      }
      if (bp.preprintedHull) {
        badges.push({ en: `+${bp.preprintedHull} Hull`, zh: `+${bp.preprintedHull} 船体`, tone: 'positive' });
      }
      modifiers.push({ shipType, badges });
      continue;
    }

    const baseBp = baseline[shipType];
    if (!baseBp) continue;

    const badges: FactionBlueprintBadge[] = [];
    const baseStats = calculateBlueprintStats(baseBp);
    const curStats = calculateBlueprintStats(bp);

    const powerDelta = (bp.preprintedPower || 0) - (baseBp.preprintedPower || 0);
    if (powerDelta !== 0) {
      const sign = powerDelta > 0 ? '+' : '';
      badges.push({
        en: `${sign}${powerDelta} ⚡`,
        zh: `${sign}${powerDelta} ⚡`,
        tone: powerDelta > 0 ? 'positive' : 'negative',
      });
    }

    const initDelta = (bp.baseInitiative || 0) - (baseBp.baseInitiative || 0);
    if (initDelta !== 0) {
      const sign = initDelta > 0 ? '+' : '';
      badges.push({
        en: `${sign}${initDelta} Init`,
        zh: `${sign}${initDelta} 先攻`,
        tone: initDelta > 0 ? 'positive' : 'negative',
      });
    }

    const compDelta = (bp.preprintedComputer || 0) - (baseBp.preprintedComputer || 0);
    if (compDelta !== 0) {
      badges.push({
        en: `+${compDelta} Comp`,
        zh: `+${compDelta} 电脑`,
        tone: 'positive',
      });
    }

    const shieldDelta = (bp.preprintedShield || 0) - (baseBp.preprintedShield || 0);
    if (shieldDelta !== 0) {
      badges.push({
        en: `-${shieldDelta} Shield`,
        zh: `-${shieldDelta} 护盾`,
        tone: 'positive',
      });
    }

    const costDelta = (bp.baseBuildCost || 0) - (baseBp.baseBuildCost || 0);
    if (costDelta !== 0) {
      badges.push({
        en: `Cost ${bp.baseBuildCost} (${costDelta > 0 ? '+' : ''}${costDelta})`,
        zh: `造价 ${bp.baseBuildCost} (${costDelta > 0 ? '+' : ''}${costDelta})`,
        tone: costDelta < 0 ? 'positive' : 'negative',
      });
    }

    const slotDelta = (bp.maxSlots || 0) - (baseBp.maxSlots || 0);
    if (slotDelta !== 0) {
      badges.push({
        en: `${bp.maxSlots} Slots (${slotDelta})`,
        zh: `${bp.maxSlots} 槽位 (${slotDelta})`,
        tone: slotDelta > 0 ? 'positive' : 'negative',
      });
    }

    // Also call out special starting installed Gauss Shield on Orion blueprints vs empty slot
    if (
      factionId === 'orion_hegemony' &&
      curStats.shieldBonus > baseStats.shieldBonus &&
      shieldDelta === 0
    ) {
      badges.push({ en: 'Gauss Shield', zh: '配高斯护盾', tone: 'positive' });
    }
    if (factionId === 'the_spiral' && bp.slots.some((s) => s?.id === 'shift_port')) {
      badges.push({ en: 'Shift Port', zh: '转换接口', tone: 'positive' });
    }

    if (badges.length > 0) {
      modifiers.push({ shipType, badges });
    }
  }

  return modifiers;
}

export function getFactionSheetData(faction: FactionInfo): FactionSheetData {
  const meta = FACTION_SHEET_META[faction.id];
  const terranLore = faction.isHuman ? buildTerranHistory(faction) : null;

  const portraitUrl =
    faction.portraitUrl ||
    meta?.portraitUrl ||
    FACTION_PORTRAIT_URLS[faction.id] ||
    (faction.isHuman ? '/factions/terran_human.jpg' : '');

  const historyEn =
    faction.historyEn ||
    meta?.historyEn ||
    terranLore?.en ||
    faction.traitDescription;
  const historyZh =
    faction.historyZh ||
    meta?.historyZh ||
    terranLore?.zh ||
    faction.traitDescription;

  const homeSectorConfig: Partial<SectorTile> =
    ALL_HOME_SECTORS[faction.id] ||
    HUMAN_HOME_SECTORS[faction.id] || {
      sectorNumber: faction.startingSectorNumber,
      name: faction.id === 'mega_war_inc' ? 'Any Unused Terran Sector (221–226)' : faction.name,
      ring: 2,
      victoryPoints: 3,
      hasArtifact: true,
      wormholes: [true, false, true, true, false, true],
      planets: [
        { id: `${faction.id}_p1`, resource: 'money', isAdvanced: false },
        { id: `${faction.id}_p2`, resource: 'science', isAdvanced: false },
        { id: `${faction.id}_p3`, resource: 'material', isAdvanced: false },
        { id: `${faction.id}_p4`, resource: 'money', isAdvanced: true },
        { id: `${faction.id}_p5`, resource: 'science', isAdvanced: true },
      ],
    };

  const homeSector: Partial<SectorTile> = {
    ...homeSectorConfig,
    sectorNumber: faction.startingSectorNumber || homeSectorConfig.sectorNumber,
  };

  const startingShips: FactionStartingShipInfo[] = meta?.startingShips || [
    { shipType: 'interceptor', count: 1 },
  ];

  const rules: FactionRuleEntry[] =
    meta?.rules ||
    (faction.isHuman
      ? buildTerranRules(faction)
      : [
          {
            id: `${faction.id}_trait`,
            icon: 'vp',
            en: faction.traitDescription,
            zh: faction.traitDescription,
          },
        ]);

  return {
    faction,
    portraitUrl,
    historyEn,
    historyZh,
    activations: {
      explore: faction.exploreActivations ?? 1,
      research: faction.researchActivations ?? 1,
      upgrade: faction.upgradeActivations ?? 2,
      build: faction.buildActivations ?? 2,
      move: faction.moveActivations ?? (faction.isHuman ? 3 : 2),
      influence: faction.influenceActivations ?? 2,
    },
    startingShips,
    homeSector,
    reputationSlotTypes: getFactionReputationSlotTypes(faction),
    rules,
    blueprintModifiers: computeFactionBlueprintModifiers(faction.id),
  };
}
