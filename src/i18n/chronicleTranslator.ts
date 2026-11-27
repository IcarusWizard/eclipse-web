import { AppLanguage } from './LanguageContext';
import {
  translateTechName,
  translatePartName,
  translateFactionName,
  translateMinorSpeciesName,
  translateShipType,
  translateResourceType,
  translateTechCategory,
} from './catalogTranslations';
import { ALL_TECH_CATALOG } from '../engine/rules/techData';
import { SHIP_PARTS } from '../engine/rules/partData';
import { ALL_FACTIONS } from '../engine/rules/setup';
import { ALL_MINOR_SPECIES_TILES } from '../engine/rules/minorSpecies';

let cachedNameZhMap: Map<string, string> | null = null;

function getEntityNameZhMap(): Map<string, string> {
  if (cachedNameZhMap) return cachedNameZhMap;
  const map = new Map<string, string>([
    ['+6 Materials', '+6 材料'],
    ['+5 Science', '+5 科研'],
    ['+8 Money', '+8 信用'],
    ['+2 Materials, +2 Science, +3 Money', '+2 材料、+2 科研、+3 信用'],
    ['+3 Money +3 Resource', '+3 信用 +3 任选资源'],
    ['Ancient Tech', '远古科技'],
    ['Ancient Cruiser', '远古巡洋舰'],
    ['Ancient Orbital', '远古轨道站'],
    ['Ancient Monolith', '远古方尖碑'],
    ['Ancient Warp Portal', '远古跃迁传送门'],
    ['Artifact Codex', '神器法典'],
    ['Ancient Might', '远古神威'],
    ['Money', '信用'],
    ['MONEY', '信用'],
    ['Science', '科研'],
    ['SCIENCE', '科研'],
    ['Materials', '材料'],
    ['MATERIALS', '材料'],
    ['Material', '材料'],
    ['MATERIAL', '材料'],
    ['Gray', '任意/灰色'],
    ['GRAY', '任意/灰色'],
    ['Unknown', '未知'],
    ['None', '无'],
  ]);

  for (const tech of ALL_TECH_CATALOG) {
    const zh = translateTechName(tech.id, tech.name, 'zh');
    if (zh && zh !== tech.name) {
      map.set(tech.name, zh);
    }
  }
  for (const part of Object.values(SHIP_PARTS)) {
    const zh = translatePartName(part.id, part.name, 'zh');
    if (zh && zh !== part.name) {
      map.set(part.name, zh);
    }
  }
  for (const faction of ALL_FACTIONS) {
    const zh = translateFactionName(faction.id, faction.name, 'zh');
    if (zh && zh !== faction.name) {
      map.set(faction.name, zh);
    }
  }
  for (const tile of ALL_MINOR_SPECIES_TILES) {
    const zh = translateMinorSpeciesName(tile.id, tile.name, 'zh');
    if (zh && zh !== tile.name) {
      map.set(tile.name, zh);
    }
  }

  cachedNameZhMap = map;
  return map;
}

function trEntity(raw: string): string {
  const trimmed = raw.trim();
  const map = getEntityNameZhMap();
  const direct = map.get(trimmed);
  if (direct) return direct;
  const shipLower = trimmed.toLowerCase();
  if (
    shipLower === 'interceptor' ||
    shipLower === 'cruiser' ||
    shipLower === 'dreadnought' ||
    shipLower === 'starbase' ||
    shipLower === 'ancient' ||
    shipLower === 'guardian' ||
    shipLower === 'gcds' ||
    shipLower === 'orbital' ||
    shipLower === 'monolith'
  ) {
    if (shipLower === 'orbital') return '轨道站';
    if (shipLower === 'monolith') return '方尖碑';
    return translateShipType(shipLower, 'zh');
  }
  return trimmed;
}

function trResource(raw: string): string {
  const r = raw.trim().toLowerCase();
  if (r === 'money' || r === 'credits') return translateResourceType('money', 'zh');
  if (r === 'science') return translateResourceType('science', 'zh');
  if (r === 'materials' || r === 'material') return translateResourceType('materials', 'zh');
  if (r === 'gray' || r === 'grey') return '灰色';
  return trEntity(raw);
}

function trTechTrack(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t === 'military' || t === 'grid' || t === 'nano' || t === 'rare') {
    return translateTechCategory(t, 'zh');
  }
  return raw;
}

function trList(raw: string): string {
  return raw
    .split(',')
    .map((s) => trEntity(s))
    .join('、');
}

function trUpgradeDetail(detail: string): string {
  const trimmed = detail.trim();
  let m = trimmed.match(/^installed (.+?) on (\S+) \(outside blueprint grid, replaced (.+?)\)$/);
  if (m) {
    return `在 ${trEntity(m[2])} 蓝图外侧安装了 ${trEntity(m[1])}（替换了 ${trEntity(m[3])}）`;
  }
  m = trimmed.match(/^installed (.+?) on (\S+) \(outside blueprint grid\)$/);
  if (m) {
    return `在 ${trEntity(m[2])} 蓝图外侧安装了 ${trEntity(m[1])}`;
  }
  m = trimmed.match(/^removed (.+?) from (\S+) \(outside blueprint grid\)$/);
  if (m) {
    return `从 ${trEntity(m[2])} 蓝图外侧移除了 ${trEntity(m[1])}`;
  }
  m = trimmed.match(/^installed (.+?) on (\S+) \(replaced (.+?)\)$/);
  if (m) {
    return `在 ${trEntity(m[2])} 上安装了 ${trEntity(m[1])}（替换了 ${trEntity(m[3])}）`;
  }
  m = trimmed.match(/^installed (.+?) on (\S+) \(Slot (\d+)\)$/);
  if (m) {
    return `在 ${trEntity(m[2])} 的槽位 ${m[3]} 安装了 ${trEntity(m[1])}`;
  }
  m = trimmed.match(/^removed (.+?) from (\S+)$/);
  if (m) {
    return `从 ${trEntity(m[2])} 移除了 ${trEntity(m[1])}`;
  }
  return trimmed;
}

function trActorLabel(label: string): string {
  if (label === 'Ancients' || label === 'Ancient') return '远古舰';
  if (label === 'Guardian') return '守卫舰';
  if (label === 'GCDS') return '银河中心防御系统';
  const m = label.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (m) {
    return `${m[1].trim()} (${trEntity(m[2])})`;
  }
  return label;
}

function trTurnOrderNames(raw: string): string {
  return raw
    .split('➔')
    .map((part) => part.trim())
    .join(' ➔ ');
}

/**
 * Translates engine-generated pending action confirmation descriptions for UI banners.
 */
export function translateActionDescription(description: string, language: AppLanguage): string {
  if (language !== 'zh' || !description) return description;

  let m = description.match(/^Built (\d+) unit\(s\) \/ structure\(s\)$/);
  if (m) return `建造了 ${m[1]} 艘飞船 / 建筑`;

  m = description.match(/^Upgraded (\d+) blueprint part\(s\)$/);
  if (m) return `升级了 ${m[1]} 个蓝图配件`;

  m = description.match(/^Moved fleet to Sector (\d+) Sub (\d+)$/);
  if (m) return `移动舰队至星区 ${m[1]} 子区 ${m[2]}`;

  m = description.match(/^Moved fleet to Sector (\d+)$/);
  if (m) return `移动舰队至星区 ${m[1]}`;

  if (description === 'Executed 1 fleet move') return '执行了 1 次舰队移动';

  m = description.match(/^Executed (\d+) fleet move\(s\)$/);
  if (m) return `执行了 ${m[1]} 次舰队移动`;

  m = description.match(/^Researched (\d+) technology\(ies\)$/);
  if (m) return `研发了 ${m[1]} 项科技`;

  if (description === 'Updated influence discs & colony ships') return '调整了影响力圆片与殖民船状态';
  if (description === 'Traded resources at treasury') return '在国库进行了资源交易';
  if (description === 'Explored sector hexes') return '探索了星区板块';
  if (description === 'Explored sector & resolved discovery') return '完成星区探索与发现板块结算';
  if (description === 'Passed turn for this round') return '已在本轮跳过';

  m = description.match(/^(\S+) Action$/);
  if (m) return `${m[1]} 行动`;

  return description;
}

/**
 * Masks exact Reputation Tile VP values in Chronicle log messages so opponents
 * and spectators cannot deduce another player's secret reputation VP before GAME_OVER.
 */
export function maskHiddenReputationVpInChronicle(message: string): string {
  if (!message) return message;
  let masked = message.replace(
    /^(.+?) placed a \d+ VP Reputation Tile on their track \(replaced \d+ VP\)\.$/,
    '$1 placed a secret Reputation Tile on their track (replaced a previous tile).'
  );
  masked = masked.replace(
    /^(.+?) placed a \d+ VP Reputation Tile on their track\.$/,
    '$1 placed a secret Reputation Tile on their track.'
  );
  masked = masked.replace(
    /^(.+?) returned the drawn \d+ VP Reputation Tile to the bag \(track is full\)\.$/,
    '$1 returned the drawn Reputation Tile to the bag (track is full).'
  );
  return masked;
}

/**
 * Translates Chronicle (GameLogEntry.message) strings emitted by the rules engine into Simplified Chinese.
 * Engine state logs remain canonical English so multiplayer clients and replays stay language-independent.
 */
export function translateChronicleMessage(message: string, language: AppLanguage): string {
  if (language !== 'zh' || !message) return message;

  let m: RegExpMatchArray | null;

  // --- Setup & Round / Turn Order / System Phases ---
  m = message.match(
    /^Galaxy initialized with (\d+) players in Faction Draft mode! Seating assigned on Ring 2\. Draft commences counter-clockwise starting with (.+?)\. Tech Tray populated with (\d+) regular and (\d+) rare tiles \((\d+) remaining in bag\): (.+)\.$/
  );
  if (m) {
    return `星系初始化完成，共 ${m[1]} 名玩家（种族轮抽模式），席位已分配至第 2 环。由 ${m[2]} 开始逆时针轮抽。科技盘已补充 ${m[3]} 枚常规科技与 ${m[4]} 枚稀有科技（袋中剩余 ${m[5]} 枚）：${trList(m[6])}。`;
  }

  m = message.match(
    /^Galaxy initialized with (\d+) players\. Round 1 has commenced! Tech Tray populated with (\d+) regular and (\d+) rare tiles \((\d+) remaining in bag\): (.+)\.$/
  );
  if (m) {
    return `星系初始化完成，共 ${m[1]} 名玩家，第 1 轮已开始！科技盘已补充 ${m[2]} 枚常规科技与 ${m[3]} 枚稀有科技（袋中剩余 ${m[4]} 枚）：${trList(m[5])}。`;
  }

  m = message.match(/^🚀 ROUND (\d+) has begun! Action Phase is now active\. Influence discs refreshed\.$/);
  if (m) return `🚀 第 ${m[1]} 轮开始！进入行动阶段，全部影响力圆片已刷新。`;

  m = message.match(/^Tech Tray replenished: (\d+) regular and (\d+) rare tiles added \((\d+) left in bag\)(?:: (.+?))?\.?$/);
  if (m) {
    const suffix = m[4] ? `：${trList(m[4])}` : '';
    return `科技盘已补充：新增 ${m[1]} 枚常规科技与 ${m[2]} 枚稀有科技（袋中剩余 ${m[3]} 枚）${suffix}。`;
  }

  m = message.match(/^Turn Order Track updated for Round (\d+): (.+)$/);
  if (m) return `第 ${m[1]} 轮顺位轨已更新：${trTurnOrderNames(m[2])}`;

  if (message === 'All commanders have passed consecutively! Proceeding to Combat Phase.') {
    return '所有指挥官均已连续跳过！进入战斗阶段。';
  }
  if (message === '🌱 PRE-UPKEEP COLONIZATION: Commanders may place population cubes with ready Colony Ships before income is calculated.') {
    return '🌱 维护前殖民窗口：指挥官可在计算收入前使用就绪的殖民船放置人口方块。';
  }

  // --- Draft & Setup ---
  m = message.match(/^🏛️ (.+?) drafted (.+?)! \(Seated at Ring 2 Position (\d+)\)$/);
  if (m) return `🏛️ ${m[1]} 选择了 ${trEntity(m[2])}！（第 2 环 ${m[3]} 号位）`;

  m = message.match(/^⚔️ Faction Draft complete! Round 1 begins with (.+)\.$/);
  if (m) return `⚔️ 种族轮抽完成！第 1 轮从 ${m[1]} 开始行动。`;

  // --- Pass, Pass in Advance, Auto-Pass, Revert / Confirm ---
  m = message.match(/^⚠️ Pass in Advance cancelled for (.+?): enemy fleet invasion detected!$/);
  if (m) return `⚠️ ${m[1]} 的「提前跳过」已取消：检测到敌方舰队入侵！`;

  m = message.match(/^🏳️ (.+?) was the first to pass via Pass in Advance \(\+2 Money, claims Starting Player Tile for next round\)!$/);
  if (m) return `🏳️ ${m[1]} 通过「提前跳过」首个宣布跳过（+2 信用，获得下轮起始玩家标记）！`;

  m = message.match(/^🏳️ (.+?) passed their turn via Pass in Advance\.$/);
  if (m) return `🏳️ ${m[1]} 通过「提前跳过」跳过了本轮回合。`;

  m = message.match(/^⚠️ Auto-pass paused for (.+?): enemy fleet invasion detected!$/);
  if (m) return `⚠️ ${m[1]} 的「自动跳过反应」已暂停：检测到敌方舰队入侵！`;

  m = message.match(/^⚠️ Auto-pass cannot be activated: enemy fleet invasion detected!$/);
  if (m) return '⚠️ 无法开启自动跳过：检测到敌方舰队入侵！';

  m = message.match(/^⚡ (.+?) auto-passed reaction turn \(no invasion detected\)\.$/);
  if (m) return `⚡ ${m[1]} 自动跳过了反应回合（未检测到入侵）。`;

  m = message.match(/^(.+?) turned Auto-Pass Reactions (ON|OFF)\.$/);
  if (m) return `${m[1]} 已${m[2] === 'ON' ? '开启' : '关闭'}「反应回合自动跳过」。`;

  m = message.match(/^(.+?) (enabled Pass in Advance|cancelled Pass in Advance)\.$/);
  if (m) return `${m[1]} ${m[2] === 'enabled Pass in Advance' ? '开启了提前跳过' : '取消了提前跳过'}。`;

  m = message.match(/^(.+?) was FIRST to PASS, took Next Turn Order Tile #1 \(Start Player next round\), and received 2 Credits bonus!$/);
  if (m) return `${m[1]} 首个宣布跳过，拿取了第 1 号下轮顺位板块（下轮先手）并获得 2 信用奖励！`;

  m = message.match(/^(.+?) passed and took Next Turn Order Tile #(\d+)\.$/);
  if (m) return `${m[1]} 宣布跳过并拿取了第 ${m[2]} 号下轮顺位板块。`;

  m = message.match(/^(.+?) was FIRST to PASS and received 2 Credits bonus!$/);
  if (m) return `${m[1]} 首个宣布跳过并获得 2 信用奖励！`;

  m = message.match(/^(.+?) passed for the round\.$/);
  if (m) return `${m[1]} 已在本轮宣布跳过。`;

  m = message.match(/^(.+?) passed\.$/);
  if (m) return `${m[1]} 宣布跳过。`;

  m = message.match(/^(.+?) is ready for Upkeep\.$/);
  if (m) return `${m[1]} 已准备好进入维护阶段。`;

  m = message.match(/^(.+?) confirmed action \((.+?)\) and passed turn\.$/);
  if (m) return `${m[1]} 确认了行动（${translateActionDescription(m[2], 'zh')}）并结束回合。`;

  m = message.match(/^(.+?) reverted their action \((.+?)\)\.$/);
  if (m) return `${m[1]} 撤回了刚才的行动（${translateActionDescription(m[2], 'zh')}）。`;

  // --- Shrines (Lyra) ---
  m = message.match(/^(.+?) placed a Shrine on Sector (\S+) next to (\S+) planet for (\d+) (\S+)!$/);
  if (m) return `${m[1]} 花费 ${m[4]} ${trResource(m[5])}，在星区 ${m[2]} 的 ${trResource(m[3])} 行星旁建造了一座神社！`;

  m = message.match(/^🌟 (.+?) completed Row 1 of their Shrine Board and unlocked the Wormhole Generator ability!$/);
  if (m) return `🌟 ${m[1]} 完成了神社面板第 1 行，解锁了「虫洞发生器」能力！`;

  m = message.match(/^🌟 (.+?) completed Row 2 of their Shrine Board and drew Discovery Tile "(.+?)"\. Since they do not control their Starting Sector, it was kept for 2 VP!$/);
  if (m) return `🌟 ${m[1]} 完成了神社面板第 2 行，抽取了探索板块「${trEntity(m[2])}」。因未控制起始星区，已直接保留为 2 VP！`;

  m = message.match(/^🌟 (.+?) completed Row 2 of their Shrine Board and drew Discovery Tile "(.+?)"! Must decide whether to claim reward or keep for 2 VP\.$/);
  if (m) return `🌟 ${m[1]} 完成了神社面板第 2 行，抽取了探索板块「${trEntity(m[2])}」！需选择领取奖励或保留 2 VP。`;

  m = message.match(/^🌟 (.+?) completed Row 3 of their Shrine Board and gained \+1 bonus Influence Disc!$/);
  if (m) return `🌟 ${m[1]} 完成了神社面板第 3 行，获得 +1 额外影响力圆片！`;

  // --- 4th Tech Track Discovery ---
  m = message.match(/^✨ (.+?) placed a 4th tech on a tech track! Revealed facedown Discovery Tile "(.+?)"\. Since they do not control their Starting Sector, it was kept for 2 VP!$/);
  if (m) return `✨ ${m[1]} 在科技轨放置了第 4 枚科技！翻开暗置探索板块「${trEntity(m[2])}」。因未控制起始星区，已直接保留为 2 VP！`;

  m = message.match(/^✨ (.+?) placed a 4th tech on a tech track! Revealed facedown Discovery Tile "(.+?)"! Must decide whether to claim reward or keep for 2 VP\.$/);
  if (m) return `✨ ${m[1]} 在科技轨放置了第 4 枚科技！翻开暗置探索板块「${trEntity(m[2])}」！需选择领取奖励或保留 2 VP。`;

  // --- Explore / Nebula / Black Hole / Supernova ---
  m = message.match(/^(.+?) \(Draco\) drew 2 tiles, chose Sector (\d+), and placed Sector (\d+) at bottom of deck\.$/);
  if (m) return `${m[1]}（天龙后裔）抽取了 2 枚板块，选择放置星区 ${m[2]}，并将星区 ${m[3]} 放回牌库底。`;

  m = message.match(/^(.+?) tried to explore Ring (\d+), but the sector deck is exhausted!$/);
  if (m) return `${m[1]} 尝试探索第 ${m[2]} 环，但该环星区牌库已耗尽！`;

  m = message.match(/^(.+?) explored Sector (\d+) at \((-?\d+), (-?\d+)\) and placed an Influence Disc!$/);
  if (m) return `${m[1]} 在坐标 (${m[3]}, ${m[4]}) 探索了星区 ${m[2]} 并放置了影响力圆片！`;

  m = message.match(/^(.+?) explored Sector (\d+) at \((-?\d+), (-?\d+)\)\.$/);
  if (m) return `${m[1]} 在坐标 (${m[3]}, ${m[4]}) 探索了星区 ${m[2]}。`;

  m = message.match(/^(.+?) revealed Nebula Sector (\d+) \((.+?)\)! Contains 3 Subsectors with 2 Discovery Tiles and 1 Ancient ship\.$/);
  if (m) return `${m[1]} 翻开了星云星区 ${m[2]}（${m[3]}）！内含 3 个子星区、2 枚探索板块与 1 艘远古舰。`;

  m = message.match(/^(.+?) revealed Black Hole Sector (\d+) \((.+?)\)! First ship to enter will claim the Discovery Tile\.$/);
  if (m) return `${m[1]} 翻开了黑洞星区 ${m[2]}（${m[3]}）！首艘进入该黑洞的飞船将领取其中的探索板块。`;

  m = message.match(/^(.+?) discovered Ancient artifact "(.+?)" in Sector (\S+)! Awaiting commander's decision\.\.\.$/);
  if (m) return `${m[1]} 在星区 ${m[3]} 发现了远古探索板块「${trEntity(m[2])}」！等待指挥官决策…`;

  m = message.match(/^(.+?) revealed Sector (\d+) containing a Discovery Tile, guarded by (\d+) Ancient ship\(s\)!$/);
  if (m) return `${m[1]} 翻开了星区 ${m[2]}，其中有一枚探索板块并由 ${m[3]} 艘远古舰守卫！`;

  m = message.match(/^(.+?) discarded explored sector tile from Ring (\d+) to the bottom of the stack\.$/);
  if (m) return `${m[1]} 弃置了从第 ${m[2]} 环抽取的星区板块（放回牌库底）。`;

  m = message.match(/^(.+?) has no further valid sectors to explore; exploration finished\.$/);
  if (m) return `${m[1]} 已无合法的可探索星区，探索行动结束。`;

  m = message.match(/^(.+?) finished their exploration action\.$/);
  if (m) return `${m[1]} 结束了探索行动。`;

  m = message.match(/^(.+?) placed an Influence Disc on Sector (\S+) to take control!$/);
  if (m) return `${m[1]} 在星区 ${m[2]} 放置了影响力圆片以取得控制权！`;

  m = message.match(/^(.+?) placed an Influence Disc to take control of Sector (\S+)!$/);
  if (m) return `${m[1]} 放置了一枚影响力圆片以控制星区 ${m[2]}！`;

  m = message.match(/^(.+?) chose not to control Sector (\S+)\.$/);
  if (m) return `${m[1]} 选择不控制星区 ${m[2]}。`;

  m = message.match(/^(.+?) chose not to place an Influence Disc in Sector (\S+)\.$/);
  if (m) return `${m[1]} 选择不在星区 ${m[2]} 放置影响力圆片。`;

  m = message.match(/^(.+?) has no Influence Discs remaining on track to control Sector (\S+)\.$/);
  if (m) return `${m[1]} 的影响力轨上已无可用圆片，无法控制星区 ${m[2]}。`;

  m = message.match(/^(.+?) uncovered another Ancient artifact "(.+?)" in Sector (\S+)! Awaiting commander's decision\.\.\.$/);
  if (m) return `${m[1]} 在星区 ${m[3]} 又发现了一枚远古探索板块「${trEntity(m[2])}」！等待指挥官决策…`;

  // --- Research & Tech ---
  m = message.match(/^(.+?) placed the Warp Portal Tile on Sector (\d+) \(\+1 VP to controller at game end\)!$/);
  if (m) return `${m[1]} 将跃迁传送门板块放置于星区 ${m[2]}（控制者终局额外 +1 VP）！`;

  m = message.match(/^(.+?) gained (\d+) bonus Influence Discs? from (.+?)\.$/);
  if (m) return `${m[1]} 通过「${trEntity(m[3])}」获得了 ${m[2]} 枚额外影响力圆片。`;

  m = message.match(/^(.+?) researched Ancient Labs and drew Discovery Tile "(.+?)"! Must decide whether to claim reward or keep for 2 VP\.$/);
  if (m) return `${m[1]} 研发了「远古实验室」并抽取了探索板块「${trEntity(m[2])}」！需选择领取奖励或保留 2 VP。`;

  m = message.match(/^(.+?) activated Artifact Key across (\d+) controlled Artifact\(s\) and received (\d+) Money, (\d+) Science, (\d+) Materials!$/);
  if (m) return `${m[1]} 触发了「神器密钥」（控制 ${m[2]} 个神器星区），获得 ${m[3]} 信用、${m[4]} 科研、${m[5]} 材料！`;

  m = message.match(/^(.+?) allocated Artifact Key rewards: (\d+) Money, (\d+) Science, (\d+) Materials!$/);
  if (m) return `${m[1]} 分配了「神器密钥」奖励：${m[2]} 信用、${m[3]} 科研、${m[4]} 材料！`;

  m = message.match(/^(.+?) researched (.+?) for (\d+) Science \((.+?) track\)\.$/);
  if (m) return `${m[1]} 花费 ${m[3]} 科研研发了「${trEntity(m[2])}」（放入${trTechTrack(m[4])}轨）。`;

  // --- Upgrade / Build / Pulsar ---
  m = message.match(/^🌟 (.+?) activated Pulsar in Sector (\d+) \(shifted disc to (\S+)\)!$/);
  if (m) {
    const actZh =
      m[3] === 'UPGRADE' ? '升级' : m[3] === 'BUILD' ? '建造' : m[3] === 'MOVE' ? '移动' : m[3];
    return `🌟 ${m[1]} 激活了星区 ${m[2]} 的脉冲星（将圆片拨至「${actZh}」）！`;
  }

  m = message.match(/^🛠️ (.+?) upgraded ship blueprints(?:: (.+))?\.$/);
  if (m) {
    const details = m[2]
      ? '：' + m[2].split(',').map((d) => trUpgradeDetail(d)).join('，')
      : '';
    return `🛠️ ${m[1]} 升级了飞船蓝图${details}。`;
  }

  m = message.match(/^🏗️ (.+?) built a Monolith in Sector (\d+) for (\d+) Materials\.$/);
  if (m) return `🏗️ ${m[1]} 花费 ${m[3]} 材料在星区 ${m[2]} 建造了一座方尖碑。`;

  m = message.match(/^🛰️ (.+?) built an Orbital in Sector (\d+) for (\d+) Materials\.$/);
  if (m) return `🛰️ ${m[1]} 花费 ${m[3]} 材料在星区 ${m[2]} 建造了一座轨道站。`;

  m = message.match(/^🚀 (.+?) constructed a (\S+) in Sector (\d+) for (\d+) Materials\.$/);
  if (m) return `🚀 ${m[1]} 花费 ${m[4]} 材料在星区 ${m[3]} 建造了一艘 ${trEntity(m[2])}。`;

  m = message.match(/^🌟 (.+?) activated Pulsar in Sector (\d+) to Move a (\S+) from Sector (\d+) to Sector (\d+)!$/);
  if (m) return `🌟 ${m[1]} 激活了星区 ${m[2]} 的脉冲星，将一艘 ${trEntity(m[3])} 从星区 ${m[4]} 移动至星区 ${m[5]}！`;

  m = message.match(/^🏗️ (.+?) activated Pulsar to build a Monolith in Sector (\d+) for (\d+) Materials\.$/);
  if (m) return `🏗️ ${m[1]} 激活脉冲星，花费 ${m[3]} 材料在星区 ${m[2]} 建造了一座方尖碑。`;

  m = message.match(/^🛰️ (.+?) activated Pulsar to build an Orbital in Sector (\d+) for (\d+) Materials\.$/);
  if (m) return `🛰️ ${m[1]} 激活脉冲星，花费 ${m[3]} 材料在星区 ${m[2]} 建造了一座轨道站。`;

  m = message.match(/^🚀 (.+?) activated Pulsar to construct a (\S+) in Sector (\d+) for (\d+) Materials\.$/);
  if (m) return `🚀 ${m[1]} 激活脉冲星，花费 ${m[3]} 材料在星区 ${m[2]} 建造了一艘 ${trEntity(m[2])}。`;

  m = message.match(/^🛠️ (.+?) activated Pulsar to upgrade (\S+) blueprint\.$/);
  if (m) return `🛠️ ${m[1]} 激活脉冲星，升级了 ${trEntity(m[2])} 蓝图。`;

  // --- Move & Black Hole & Nebula ---
  m = message.match(/^(.+?)'s (\S+) entered Black Hole Sector (\d+) \((.+?)\) and claimed the Discovery Tile!$/);
  if (m) return `${m[1]} 的 ${trEntity(m[2])} 进入了黑洞星区 ${m[3]}（${m[4]}）并领取了探索板块！`;

  m = message.match(/^💥 Black Hole anomaly: (.+?)'s (\S+) rolled ([^ ]+) \(Star\/Blank\) and sustained (\d+) damage! Hull breached \(destroyed\)!$/);
  if (m) return `💥 黑洞异象：${m[1]} 的 ${trEntity(m[2])} 掷出 ${m[3]} 并受到 ${m[4]} 点伤害！船体损毁（被摧毁）！`;

  m = message.match(/^🌀 Black Hole anomaly: (.+?)'s (\S+) rolled ([^ ]+) \(Star\/Blank\)! Returned immediately to Sector (\d+) with 1 damage!$/);
  if (m) return `🌀 黑洞异象：${m[1]} 的 ${trEntity(m[2])} 掷出 ${m[3]}！承受 1 点伤害并立即返回星区 ${m[4]}！`;

  m = message.match(/^🌀 Black Hole anomaly: (.+?)'s (\S+) rolled ([^!]+)! Trapped in spacetime; will emerge in Round (\d+)\.$/);
  if (m) return `🌀 黑洞异象：${m[1]} 的 ${trEntity(m[2])} 掷出 ${m[3]}！被困时空裂缝，将在第 ${m[4]} 轮回归。`;

  m = message.match(/^🌀 (.+?)'s (\S+) emerged from Black Hole (\d+) spacetime anomaly and returned to Sector (\d+)!$/);
  if (m) return `🌀 ${m[1]} 的 ${trEntity(m[2])} 从黑洞 ${m[3]} 时空裂缝脱离，返回至星区 ${m[4]}！`;

  m = message.match(/^⚠️ Commander (.+?)'s (\S+) could not find a legal return sector from Black Hole (\d+) and returned to reserve\.$/);
  if (m) return `⚠️ 指挥官 ${m[1]} 的 ${trEntity(m[2])} 无法从黑洞 ${m[3]} 找到合法返回星区，已退回备用库。`;

  m = message.match(/^🌀 (.+?) returned a (\S+) from Black Hole spacetime anomaly into Sector (\d+)!$/);
  if (m) return `🌀 ${m[1]} 将一艘 ${trEntity(m[2])} 从黑洞时空裂缝返回至星区 ${m[3]}！`;

  m = message.match(/^(.+?) moved a (\S+) from Sector (\d+) Sub (\d+) to Sector (\d+) Sub (\d+)\.$/);
  if (m) return `${m[1]} 将一艘 ${trEntity(m[2])} 从星区 ${m[3]} 子区 ${m[4]} 移动至星区 ${m[5]} 子区 ${m[6]}。`;

  m = message.match(/^(.+?) navigated a (\S+) from Sector (\d+)(?: Sub (\d+))? to Sector (\d+)(?: Sub (\d+))?\.$/);
  if (m) {
    const fromSub = m[4] ? ` 子区 ${m[4]}` : '';
    const toSub = m[6] ? ` 子区 ${m[6]}` : '';
    return `${m[1]} 驾驶一艘 ${trEntity(m[2])} 从星区 ${m[3]}${fromSub} 航行至星区 ${m[5]}${toSub}。`;
  }

  // --- Diplomacy & Minor Species ---
  m = message.match(/^⚔️ (.+?) ended movement in allied space of (.+?), breaking the alliance and claiming the Traitor Tile \(-2 VP\)!$/);
  if (m) return `⚔️ ${m[1]} 在盟友 ${m[2]} 的星区结束了移动，背弃同盟并获得了「叛徒板块」(-2 VP)！`;

  m = message.match(/^🤝 (.+?) \((.+?)\) and (.+?) \((.+?)\) established Diplomatic Relations and exchanged Ambassadors \(\+1 VP each\)!$/);
  if (m) return `🤝 ${m[1]} (${m[2]}) 与 ${m[3]} (${m[4]}) 缔结外交关系并互换大使（各自 +1 VP）！`;

  m = message.match(/^🤝 (.+?) proposed an Ambassador Exchange with (.+?) \(offering a (.+?) cube\)\. Waiting for acceptance\.$/);
  if (m) return `🤝 ${m[1]} 向 ${m[2] === 'another empire' ? '另一帝国' : m[2]} 提出了互换大使外交请求（提供 ${m[3]} 人口方块），等待对方回应。`;

  m = message.match(/^🤝 Diplomatic proposal between (.+?) and (.+?) cancelled: (.+)$/);
  if (m) return `🤝 ${m[1]} 与 ${m[2]} 之间的外交提议已取消：${m[3]}`;

  m = message.match(/^🤝 (.+?) ACCEPTED the Diplomatic Proposal from (.+?)! Exchanged ambassadors \((.+?) \/ (.+?)\) \(\+1 VP each\)\.$/);
  if (m) return `🤝 ${m[1]} 接受了 ${m[2]} 的外交提议！双方互换大使 (${m[3]} / ${m[4]})（各自 +1 VP）。`;

  m = message.match(/^🤝 (.+?) DECLINED the Diplomatic Proposal from (.+?)\.$/);
  if (m) return `🤝 ${m[1]} 拒绝了 ${m[2]} 的外交提议。`;

  m = message.match(/^⚔️ (.+?) betrayed and broke diplomatic relations with (.+?), claiming the Traitor Tile \(-2 VP\)!$/);
  if (m) return `⚔️ ${m[1]} 背叛并断绝了与 ${m[2]} 的外交关系，获得「叛徒板块」(-2 VP)！`;

  m = message.match(/^🤝 (.+?) formed Diplomatic Relations with Minor Species: (.+?) for (\d+) Money!$/);
  if (m) return `🤝 ${m[1]} 花费 ${m[3]} 信用与次要种族「${trEntity(m[2])}」建立了外交关系！`;

  // --- Influence / Colonize / Trade / Exiles Orbital ---
  m = message.match(/^(.+?) claimed control of Sector (\d+) with an Influence Disc!$/);
  if (m) return `${m[1]} 放置影响力圆片取得了星区 ${m[2]} 的控制权！`;

  m = message.match(/^(.+?) removed their Influence Disc and returned population cubes from Sector (\d+)\.$/);
  if (m) return `${m[1]} 移除了星区 ${m[2]} 的影响力圆片并收回了人口方块。`;

  m = message.match(/^(.+?) colonized a (\S+) slot in Sector (\d+)\.$/);
  if (m) return `${m[1]} 在星区 ${m[3]} 殖民了一个${trResource(m[2])}行星生态位。`;

  m = message.match(/^(.+?) colonized a (\S+) habitat in Sector (\d+) using a Colony Ship!$/);
  if (m) return `${m[1]} 使用殖民船在星区 ${m[3]} 殖民了一个${trResource(m[2])}栖息地！`;

  m = message.match(/^(.+?) flipped back a Colony Ship face-up from the Influence action \((\d+) refresh\(es\) remaining\)\.$/);
  if (m) return `${m[1]} 通过「扩张」行动翻回就绪 1 艘殖民船（剩余可刷新 ${m[2]} 艘）。`;

  m = message.match(/^(.+?) traded (\d+) (\S+) for (\d+) (\S+)\.$/);
  if (m) return `${m[1]} 用 ${m[2]} ${trResource(m[3])} 交易换取了 ${m[4]} ${trResource(m[5])}。`;

  m = message.match(/^(.+?) converted (\d+) Colony Ship\(s\) to (\d+) (\S+)!$/);
  if (m) return `${m[1]} 将 ${m[2]} 艘殖民船转换为了 ${m[3]} ${trResource(m[4])}！`;

  m = message.match(/^🛰️ (.+?) placed a (\S+) population cube on starting Orbital in Sector (\d+)\.$/);
  if (m) return `🛰️ ${m[1]} 在星区 ${m[3]} 的起始轨道站放置了 1 枚${trResource(m[2])}人口方块。`;

  // --- Discovery Claims ---
  m = message.match(/^(.+?) chose to keep Discovery Tile "(.+?)" for 2 Victory Points!$/);
  if (m) return `${m[1]} 选择保留探索板块「${trEntity(m[2])}」以换取 2 VP！`;

  m = message.match(/^(.+?) placed an Ancient Orbital in Sector (\d+) and colonized it with (\S+) using 1 Colony Ship!$/);
  if (m) return `${m[1]} 在星区 ${m[2]} 放置了一座远古轨道站，并消耗 1 艘殖民船以${trResource(m[3])}人口殖民！`;

  m = message.match(/^(.+?) placed an Ancient Orbital in Sector (\d+)!$/);
  if (m) return `${m[1]} 在星区 ${m[2]} 放置了一座远古轨道站！`;

  m = message.match(/^(.+?) placed an Ancient Monolith in Sector (\d+)!$/);
  if (m) return `${m[1]} 在星区 ${m[2]} 放置了一座远古方尖碑！`;

  m = message.match(/^(.+?) discovered and placed an Ancient Warp Portal in Sector (\d+)!$/);
  if (m) return `${m[1]} 发现并在星区 ${m[2]} 放置了一座远古跃迁传送门！`;

  m = message.match(/^(.+?) activated Artifact Codex: will gain \+1 VP for each controlled Artifact at game end!$/);
  if (m) return `${m[1]} 激活了「神器法典」：终局时每个所控神器额外 +1 VP！`;

  m = message.match(/^(.+?) activated Ancient Might: will gain \+1 VP for each 3 VP in Reputation Tile value at game end!$/);
  if (m) return `${m[1]} 激活了「远古神威」：终局时声望板块每满 3 VP 额外 +1 VP！`;

  m = message.match(/^(.+?) gained \+3 Money and \+3 Money \(\+6 Money total\) from Discovery Tile!$/);
  if (m) return `${m[1]} 从探索板块获得了 +3 信用与 +3 信用（共 +6 信用）！`;

  m = message.match(/^(.+?) gained \+3 Money and \+3 (\S+) from Discovery Tile!$/);
  if (m) return `${m[1]} 从探索板块获得了 +3 信用与 +3 ${trResource(m[2])}！`;

  m = message.match(/^(.+?) acquired free Ancient Tech: (.+?)!$/);
  if (m) return `${m[1]} 免费获得了远古科技：「${trEntity(m[2])}」！`;

  m = message.match(/^(.+?) explored Ancient Tech but no eligible regular tech remained in the supply\.$/);
  if (m) return `${m[1]} 触发了远古科技奖励，但供应堆已无符合条件的常规科技。`;

  m = message.match(/^(.+?) deployed a free (\S+) to Sector (\d+)!$/);
  if (m) return `${m[1]} 在星区 ${m[3]} 免费部署了一艘 ${trEntity(m[2])}！`;

  m = message.match(/^(.+?) could not deploy free (\S+): maximum limit of (\d+) already deployed\.$/);
  if (m) return `${m[1]} 无法免费部署 ${trEntity(m[2])}：已达到 ${m[3]} 艘的部署上限。`;

  m = message.match(/^(.+?) placed Ancient Tech "(.+?)" outside the blueprint grid of their (\S+) \(\+2 Power, \+1 Initiative\)!$/);
  if (m) return `${m[1]} 将远古配件「${trEntity(m[2])}」安装在了 ${trEntity(m[3])} 蓝图外侧（+2 能量，+1 先攻）！`;

  m = message.match(/^(.+?) equipped Ancient Tech "(.+?)" directly to their (\S+) blueprint \(Slot (\d+)\)!$/);
  if (m) return `${m[1]} 将远古配件「${trEntity(m[2])}」直接装备到了 ${trEntity(m[3])} 蓝图（槽位 ${m[4]}）！`;

  m = message.match(/^(.+?) claimed Ancient Tech module "(.+?)" for future ship upgrades!$/);
  if (m) return `${m[1]} 收取了远古飞船配件「${trEntity(m[2])}」，可用于后续飞船升级！`;

  m = message.match(/^(.+?) claimed Discovery Reward: (.+?) \((.+)\)!$/);
  if (m) return `${m[1]} 领取了探索奖励：「${trEntity(m[2])}」！`;

  // --- Economy / Upkeep / Production / Bankruptcy / Supernova ---
  m = message.match(/^💰 UPKEEP: (.+?) earned (-?\d+) Credits income, paid (-?\d+) Upkeep \(Net: ([+-]?\d+), Treasury: (-?\d+)\)\.$/);
  if (m) return `💰 维护结算：${m[1]} 获得 ${m[2]} 信用收入，支付 ${m[3]} 信用维护费（净收支 ${m[4]}，国库余额 ${m[5]}）。`;

  m = message.match(/^⚠️ TACTICAL BANKRUPTCY: (.+?) has a budget deficit of (\d+) Credits! Must abandon controlled sectors to balance the budget\.$/);
  if (m) return `⚠️ 战术破产危机：${m[1]} 面临 ${m[2]} 信用预算赤字！必须放弃部分受控星区以平衡收支。`;

  m = message.match(/^🚨 CIVILIZATION COLLAPSE: (.+?) has no sectors remaining to abandon and is ELIMINATED from the galaxy!$/);
  if (m) return `🚨 文明崩溃：${m[1]} 已无星区可放弃，被淘汰出银河！`;

  m = message.match(/^(.+?) abandoned Sector (\d+) during bankruptcy, saving (\d+) upkeep!$/);
  if (m) return `${m[1]} 在破产清算中放弃了星区 ${m[2]}，节省了 ${m[3]} 信用维护费！`;

  m = message.match(/^(.+?) abandoned Sector (\d+), returning an Influence Disc and population cubes \(saved (\d+) upkeep\)!$/);
  if (m) return `${m[1]} 放弃了星区 ${m[2]}，收回影响力圆片与人口方块（节省 ${m[3]} 信用维护费）！`;

  m = message.match(/^(.+?) restored budget solvency! Deficit cleared\.$/);
  if (m) return `${m[1]} 成功恢复预算平衡！赤字已清零。`;

  m = message.match(/^🔬 PRODUCTION: (.+?) collected \+(\d+) Science \(Total: (\d+)\) and \+(\d+) Materials \(Total: (\d+)\)\.$/);
  if (m) return `🔬 生产结算：${m[1]} 收获 +${m[2]} 科研（总计 ${m[3]}）和 +${m[4]} 材料（总计 ${m[5]}）。`;

  m = message.match(/^💥 SUPERNOVA EXPLOSION! Supernova Sector (\d+) \((.+?)\) rolled \[(\d+), (\d+)\] \+ Tech (\d+) = (\d+) < Round (\d+)! The star went supernova and obliterated all ships, structures, and populations!$/);
  if (m) return `💥 超新星爆发！超新星星区 ${m[1]}（${m[2]}）掷出 [${m[3]}, ${m[4]}] + 科技加成 ${m[5]} = ${m[6]} < 第 ${m[7]} 轮！恒星坍缩爆发，摧毁了星区内所有舰船、建筑与人口！`;

  m = message.match(/^🌟 Supernova Sector (\d+) \((.+?)\) remains stable for Round (\d+) \(Dice \[(\d+), (\d+)\] \+ Tech (\d+) = (\d+) >= Round (\d+)\)\.$/);
  if (m) return `🌟 超新星星区 ${m[1]}（${m[2]}）在第 ${m[3]} 轮保持稳定（掷骰 [${m[4]}, ${m[5]}] + 科技加成 ${m[6]} = ${m[7]} ≥ 第 ${m[8]} 轮）。`;

  // --- Combat, Reroll, Bombardment, Reputation, Conquest ---
  m = message.match(/^🎲 (.+?) flipped 1 Colony Ship to reroll die #(\d+): rolled (\d+) \((.+)\)!$/);
  if (m) {
    const resStr = m[4] === 'MISS' ? '未命中' : m[4].replace(/^HIT! \[(\d+) dmg\]$/, '命中！[$1 伤害]');
    return `🎲 ${m[1]} 横置 1 艘殖民船重掷第 ${m[2]} 颗骰子：掷出 ${m[3]}（${resStr}）！`;
  }

  m = message.match(/^🎲 (.+?) invoked Favour of the Fates to reroll die #(\d+): rolled (\d+) \((.+)\)!$/);
  if (m) {
    const resStr = m[4] === 'MISS' ? '未命中' : m[4].replace(/^HIT! \[(\d+) dmg\]$/, '命中！[$1 伤害]');
    return `🎲 ${m[1]} 发动「命运眷顾」免费重掷第 ${m[2]} 颗骰子：掷出 ${m[3]}（${resStr}）！`;
  }

  m = message.match(/^🎲 (.+?) flipped 1 Colony Ship to reroll bombardment die #(\d+): rolled (\d+) \((.+)\)!$/);
  if (m) {
    const resStr =
      m[4] === 'MISS'
        ? '未命中'
        : m[4]
            .replace(/^HIT! \[(\d+) dmg \+ (\d+) self\]$/, '命中！[$1 伤害 + $2 自伤]')
            .replace(/^HIT! \[(\d+) dmg\]$/, '命中！[$1 伤害]')
            .replace(/^BACKFIRE \[(\d+) self\]$/, '反噬 [$1 自伤]');
    return `🎲 ${m[1]} 横置 1 艘殖民船重掷第 ${m[2]} 颗轰炸骰：掷出 ${m[3]}（${resStr}）！`;
  }

  m = message.match(/^📦 (.+?) placed destroyed (Orbital|Wild) population cube from Sector (\d+) in the (\S+) Casualty Slot \(returns during Cleanup\)\.$/);
  if (m) {
    const kind = m[2] === 'Orbital' ? '轨道站' : '万能行星';
    return `📦 ${m[1]} 将星区 ${m[3]} 被摧毁的${kind}人口方块放入 ${trResource(m[4])} 伤亡槽（将于清理阶段返回轨道）。`;
  }

  m = message.match(/^🎯 (.+?) dealt (\d+) bombardment damage against (\d+) population cubes in Sector (\d+) — awaiting attacker's selection of cubes to destroy\.$/);
  if (m) {
    return `🎯 ${m[1]} 在星区 ${m[4]} 对 ${m[3]} 枚人口方块造成了 ${m[2]} 点轰炸伤害——等待进攻方选择要摧毁的人口方块。`;
  }

  m = message.match(/^⚔️ Sector (\d+): (.+?) salvo \[([^\]]*)\] ➔ (\d+) hit\(s\), (\d+) dmg\.$/);
  if (m) return `⚔️ 星区 ${m[1]}：${trActorLabel(m[2])} 齐射 [${m[3]}] ➔ ${m[4]} 次命中，共 ${m[5]} 点伤害。`;

  m = message.match(/^💚 Sector (\d+): (.+?) (\S+) regenerated (\d+) HP via (.+?) \(remaining HP: ([^)]+)\)\.$/);
  if (m) {
    const translatedSources = m[5]
      .split(' + ')
      .map((s) => trEntity(s.trim()))
      .join(' + ');
    return `💚 星区 ${m[1]}：${trActorLabel(m[2])} 的 ${trEntity(m[3])} 通过 ${translatedSources} 回复了 ${m[4]} 点生命（剩余 HP：${m[6]}）。`;
  }

  m = message.match(/^💥 (.+?) (\S+) was destroyed in Sector (\d+)!$/);
  if (m) return `💥 ${trActorLabel(m[1])} 的 ${trEntity(m[2])} 在星区 ${m[3]} 被摧毁！`;

  m = message.match(/^🏛️ The Exiles Population Cube on the destroyed Orbital in Sector (\d+) was returned to the (\S+) graveyard!$/);
  if (m) return `🏛️ 流亡者在星区 ${m[1]} 被摧毁轨道站上的人口方块已退回 ${trResource(m[2])} 墓地！`;

  m = message.match(/^(.+?) declared retreat towards Sector (\S+)\.$/);
  if (m) return `${m[1] === 'Ships' ? '舰队' : m[1]} 宣布向星区 ${m[2]} 撤退。`;

  m = message.match(/^(.+?) completed retreat into Sector (\S+)\.$/);
  if (m) return `${m[1] === 'Ships' || m[1] === 'Ship' ? '舰船' : m[1]} 已完成撤退，进入星区 ${m[2]}。`;

  m = message.match(/^🏁 Engagement resolved in Sector (\d+)! Victor: (.+?)\. Review salvo and conclude to continue\.$/);
  if (m) return `🏁 星区 ${m[1]} 交战分出胜负！胜方：${trEntity(m[2])}。请查看齐射结果后点击结束战斗继续。`;

  m = message.match(/^⚔️ Duel in Sector (\d+)(?: \(Subsector (\d+)\))? resolved\. Victor (.+?) advances to fight the next opponent without repairing\.$/);
  if (m) {
    const sub = m[2] ? `（子星区 ${m[2]}）` : '';
    return `⚔️ 星区 ${m[1]}${sub} 对决结束。胜方 ${trEntity(m[3])} 在不修复损伤的情况下迎战下一位对手。`;
  }

  m = message.match(/^Combat in Sector (\d+)(?: \(Subsector (\d+)\))? has concluded! Winner: (.+?)\.$/);
  if (m) {
    const sub = m[2] ? `（子星区 ${m[2]}）` : '';
    return `星区 ${m[1]}${sub} 的战斗已结束！胜方：${trEntity(m[3])}。`;
  }

  m = message.match(/^💰 Rho Indi Syndicate gained (\d+) Money from drawing (\d+) Reputation Tiles!$/);
  if (m) return `💰 印第安座 Rho 辛迪加通过抽取 ${m[2]} 枚声望板块获得了 ${m[1]} 信用！`;

  m = message.match(/^(.+?) placed a (\d+) VP Reputation Tile on their track \(replaced (\d+) VP\)\.$/);
  if (m) return `${m[1]} 将 1 枚 ${m[2]} VP 的声望板块放入了声望轨（替换了原有的 ${m[3]} VP 板块）。`;

  m = message.match(/^(.+?) placed a secret Reputation Tile on their track \(replaced a previous tile\)\.$/);
  if (m) return `${m[1]} 将 1 枚保密声望板块放入了声望轨（替换了原有板块）。`;

  m = message.match(/^(.+?) placed a (\d+) VP Reputation Tile on their track\.$/);
  if (m) return `${m[1]} 将 1 枚 ${m[2]} VP 的声望板块放入了声望轨。`;

  m = message.match(/^(.+?) placed a secret Reputation Tile on their track\.$/);
  if (m) return `${m[1]} 将 1 枚保密声望板块放入了声望轨。`;

  m = message.match(/^(.+?) returned the drawn (\d+) VP Reputation Tile to the bag \(track is full\)\.$/);
  if (m) return `${m[1]} 将抽到的 ${m[2]} VP 声望板块放回袋中（声望轨已满）。`;

  m = message.match(/^(.+?) returned the drawn Reputation Tile to the bag \(track is full\)\.$/);
  if (m) return `${m[1]} 将抽到的声望板块放回袋中（声望轨已满）。`;

  m = message.match(/^(.+?) declined to keep a Reputation Tile\.$/);
  if (m) return `${m[1]} 放弃保留本次抽取的声望板块。`;

  m = message.match(/^🛡️ (.+?)'s Neutron Absorber shielded population in Sector (\d+) from (.+?)'s Neutron Bombs! Attacker must bombard with conventional cannons\.$/);
  if (m) return `🛡️ ${m[1]} 的「中子吸收器」保护了星区 ${m[2]} 的人口免受 ${m[3]}「中子炸弹」毁灭！进攻方必须改用常规火炮轰炸。`;

  m = message.match(/^(.+?)'s Neutron Bombs annihilated (\d+) opponent population cube\(s\) in Sector (\d+)! \(Cubes placed in Casualty Slot\)$/);
  if (m) return `${m[1]} 的「中子炸弹」摧毁了星区 ${m[3]} 内 ${m[2]} 枚敌方人口方块！（已移入伤亡区）`;

  m = message.match(/^💥 Rift Cannon backfire during bombardment destroyed (\d+) ship\(s\) of (.+?)!$/);
  if (m) return `💥 轰炸期间裂隙炮反噬摧毁了 ${m[2]} 的 ${m[1]} 艘飞船！`;

  m = message.match(/^(.+?) bombarded Sector (\d+) population with cannons: rolled (\d+) damage, destroying (\d+) cube\(s\) \((\d+) remaining\)\. Destroyed cubes placed in Casualty Slot until Cleanup\.$/);
  if (m) return `${m[1]} 使用火炮轰炸星区 ${m[2]} 人口：造成 ${m[3]} 点伤害，摧毁了 ${m[4]} 枚人口方块（剩余 ${m[5]} 枚）。被摧毁的方块暂存于伤亡区直到清理阶段。`;

  m = message.match(/^(.+?)'s Influence Disc in Sector (\d+) was overthrown!$/);
  if (m) return `${m[1]} 在星区 ${m[2]} 的影响力圆片被推翻移除！`;

  m = message.match(/^Defender retains control of Sector (\d+) because (\d+) population cube\(s\) survived bombardment\.$/);
  if (m) return `由于有 ${m[2]} 枚人口方块在轰炸中幸存，防守方继续保留星区 ${m[1]} 的控制权。`;

  m = message.match(/^✨ Descendants of Draco \((.+?)\) retained control of Sector (\d+) and claimed Discovery Tile "(.+?)" now that the guarding Ancients have been destroyed!$/);
  if (m) return `✨ 天龙后裔 (${m[1]}) 保留了对星区 ${m[2]} 的控制权，并在守卫远古舰被消灭后成功领取探索板块「${trEntity(m[3])}」！`;

  m = message.match(/^✨ (.+?) uncovered Ancient Discovery Cache "(.+?)" in Sector (\d+)! Awaiting commander's decision\.\.\.$/);
  if (m) return `✨ ${m[1]} 在星区 ${m[3]} 发现了远古探索板块「${trEntity(m[2])}」！等待指挥官决策…`;

  m = message.match(/^✨ (.+?) secured Sector (\d+) and uncovered Ancient Discovery Cache "(.+?)"! Awaiting commander's decision\.\.\.$/);
  if (m) return `✨ ${m[1]} 占领了星区 ${m[2]} 并发现了远古探索板块「${trEntity(m[3])}」！等待指挥官决策…`;

  m = message.match(/^🌌 Commander (.+?) secured Subsector (\d+) in Nebula (\d+) and claimed the Discovery Tile!$/);
  if (m) return `🌌 指挥官 ${m[1]} 占领了星云 ${m[3]} 的子星区 ${m[2]} 并领取了探索板块！`;

  return message;
}
