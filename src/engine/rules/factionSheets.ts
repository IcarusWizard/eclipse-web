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
      name: faction.name,
      ring: 2,
      victoryPoints: 3,
      hasArtifact: true,
      wormholes: [true, false, true, true, false, true],
      planets: [
        { id: `${faction.id}_p1`, resource: 'money', isAdvanced: false },
        { id: `${faction.id}_p2`, resource: 'science', isAdvanced: false },
        { id: `${faction.id}_p3`, resource: 'material', isAdvanced: false },
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
