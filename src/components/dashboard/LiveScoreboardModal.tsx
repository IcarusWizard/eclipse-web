import React from 'react';
import { GameState } from '../../engine/types/state';
import { computeCurrentScores } from '../../engine/rules/gameReducer';
import {
  Trophy,
  X,
  Globe2,
  Building2,
  Award,
  Cpu,
  Users2,
  Sparkles,
  Crown,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateFactionName } from '../../i18n/catalogTranslations';

interface LiveScoreboardModalProps {
  state: GameState;
  viewerPlayerId?: string;
  onClose: () => void;
  onSelectPlayer?: (playerIndex: number) => void;
}

export const LiveScoreboardModal: React.FC<LiveScoreboardModalProps> = ({
  state,
  viewerPlayerId,
  onClose,
  onSelectPlayer,
}) => {
  const { l, language } = useLanguage();
  const { scores, leaderPlayerId } = computeCurrentScores(state);

  // Rank players by total VP descending
  const rankedPlayers = [...state.players].sort((a, b) => {
    const scoreA = scores[a.id]?.total ?? 0;
    const scoreB = scores[b.id]?.total ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    // Tie-breaker: total resources (money + science + materials)
    const resA = a.resources.money + a.resources.science + a.resources.materials;
    const resB = b.resources.money + b.resources.science + b.resources.materials;
    return resB - resA;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400 shadow-md shadow-amber-950/40">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2 font-display">
                <span>{l('Live Galactic Standings & Victory Points', '实时银河积分与排名')}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-950 border border-amber-700 text-amber-300">
                  {l(`Round ${state.round} / ${state.maxRounds}`, `第 ${state.round} / ${state.maxRounds} 轮`)}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {l(
                  'Calculates current live scoring if the game were to conclude right now, per official Second Dawn rules.',
                  '依据《星蚀：第二黎明》官方规则，实时计算当前若立刻结算的总分数。'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Standings Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 shadow-inner">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 text-center w-14">{l('Rank', '排名')}</th>
                  <th className="py-3 px-4">{l('Commander & Faction', '指挥官与种族')}</th>
                  <th
                    className="py-3 px-3 text-center"
                    title={l('Victory Points from Controlled Sectors & Rare Warp Portals (+1 VP)', '已控制星区及罕见跃迁门 (+1 VP) 的得分')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{l('Sectors', '星区')}</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center" title={l('3 VP per Monolith in controlled sectors', '已控制星区内每座纪念碑 3 VP')}>
                    <div className="flex items-center justify-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{l('Monoliths', '纪念碑')}</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center" title={l('Reputation Tiles placed on the track', '声望轨上放置的声望板块得分')}>
                    <div className="flex items-center justify-center gap-1">
                      <Award className="w-3.5 h-3.5 text-rose-400" />
                      <span>{l('Reputation', '声望')}</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center" title={l('Victory Points printed on Researched Techs', '已研发科技自带的胜利分')}>
                    <div className="flex items-center justify-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-pink-400" />
                      <span>{l('Techs', '科技')}</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center" title={l('1 VP per Ambassador Tile', '每枚大使板块 1 VP')}>
                    <div className="flex items-center justify-center gap-1">
                      <Users2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{l('Ambass.', '大使')}</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center" title={l('2 VP per Kept Discovery Tile & Discovery Warp Portals', '每枚保留为分数的探索板块 2 VP 及探索跃迁门加分')}>
                    <div className="flex items-center justify-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{l('Discoveries', '探索板块')}</span>
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-center"
                    title={l('Species-specific endgame bonuses (Planta sector VP, Draco Ancient VP)', '种族专属终局加分（植物人星区加分、天龙族远古船加分）')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{l('Species Trait', '种族特性')}</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right font-black text-amber-400">{l('Total VP', '总分 VP')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {rankedPlayers.map((player, rankIdx) => {
                  const b = scores[player.id] || {
                    sectors: 0,
                    monoliths: 0,
                    reputation: 0,
                    techs: 0,
                    ambassadors: 0,
                    discoveries: 0,
                    speciesBonus: 0,
                    total: 0,
                  };
                  const isLeader = rankIdx === 0;
                  const originalIndex = state.players.findIndex((p) => p.id === player.id);
                  const isSecretReputation =
                    state.phase !== 'GAME_OVER' &&
                    Boolean(viewerPlayerId) &&
                    player.id !== viewerPlayerId;

                  return (
                    <tr
                      key={player.id}
                      onClick={() => onSelectPlayer && onSelectPlayer(originalIndex)}
                      className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                        isLeader ? 'bg-amber-950/20' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center">
                        {isLeader ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-extrabold text-xs">
                            <Crown className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-slate-400">#{rankIdx + 1}</span>
                        )}
                      </td>

                      {/* Commander */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded-full shrink-0 shadow"
                            style={{ backgroundColor: player.color }}
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{player.name}</span>
                              {isLeader && (
                                <span className="text-[10px] text-amber-400 font-semibold px-1.5 py-0.2 bg-amber-950/80 border border-amber-800 rounded">
                                  {l('Leader', '领先')}
                                </span>
                              )}
                              {Boolean(b.traitor && b.traitor < 0) && (
                                <span className="text-[10px] text-rose-300 font-semibold px-1.5 py-0.2 bg-rose-950/80 border border-rose-800 rounded">
                                  {l(`Traitor (${b.traitor} VP)`, `叛徒 (${b.traitor} VP)`)}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {translateFactionName(player.faction.id, player.faction.name, language)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Sectors */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-200">
                        {b.sectors}
                      </td>

                      {/* Monoliths */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-200">
                        {b.monoliths > 0 ? (
                          <span className="text-indigo-400 font-bold">+{b.monoliths}</span>
                        ) : (
                          '0'
                        )}
                      </td>

                      {/* Reputation */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-200">
                        {isSecretReputation ? (
                          player.reputationTiles.length > 0 ? (
                            <span
                              className="text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[11px]"
                              title={l(
                                `${player.reputationTiles.length} secret reputation tile(s)`,
                                `${player.reputationTiles.length} 枚暗置声望板块`
                              )}
                            >
                              {l(
                                `? (${player.reputationTiles.length} ${player.reputationTiles.length === 1 ? 'tile' : 'tiles'})`,
                                `? (${player.reputationTiles.length} 枚)`
                              )}
                            </span>
                          ) : (
                            '0'
                          )
                        ) : b.reputation > 0 ? (
                          <span className="text-rose-400 font-bold">+{b.reputation}</span>
                        ) : (
                          '0'
                        )}
                      </td>

                      {/* Techs */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-200">
                        {b.techs > 0 ? (
                          <span className="text-pink-400 font-bold">+{b.techs}</span>
                        ) : (
                          '0'
                        )}
                      </td>

                      {/* Ambassadors */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-200">
                        {b.ambassadors > 0 ? (
                          <span className="text-emerald-400 font-bold">+{b.ambassadors}</span>
                        ) : (
                          '0'
                        )}
                      </td>

                      {/* Discoveries */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-200">
                        {b.discoveries > 0 ? (
                          <span className="text-amber-400 font-bold">+{b.discoveries}</span>
                        ) : (
                          '0'
                        )}
                      </td>

                      {/* Species Bonus */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-200">
                        {b.speciesBonus > 0 ? (
                          <span className="text-emerald-300 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                            +{b.speciesBonus}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Total VP */}
                      <td className="py-3.5 px-4 text-right">
                        {isSecretReputation && player.reputationTiles.length > 0 ? (
                          <span
                            className="font-display font-black text-base text-amber-300 drop-shadow"
                            title={l('Total known VP plus secret opponent reputation tiles', '已知胜利分加上对手暗置声望板块分数')}
                          >
                            {b.total - b.reputation} + ? VP
                          </span>
                        ) : (
                          <span className="font-display font-black text-base text-amber-400 drop-shadow">
                            {b.total} VP
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Scoring Rules Guide */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>{l('Eclipse: Second Dawn Official Scoring Breakdown', '《星蚀：第二黎明》官方计分细则')}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-400 text-[11px] leading-relaxed">
              <div>
                <strong className="text-slate-200">{l('• Sectors:', '• 星区：')}</strong>{' '}
                {l(
                  'Sum of VP printed on controlled sectors (e.g., GCDS = 4 VP, Inner = 2-3 VP, Outer = 1-2 VP).',
                  '所有已控制星区板块上印刷的胜利分总和（如银河中心防御系统 = 4 VP，内环 = 2-3 VP，外环 = 1-2 VP）。'
                )}
              </div>
              <div>
                <strong className="text-slate-200">{l('• Monoliths:', '• 纪念碑：')}</strong>{' '}
                {l('Each built Monolith in a controlled sector yields 3 VP.', '已控制星区内每座已建造的纪念碑提供 3 VP。')}
              </div>
              <div>
                <strong className="text-slate-200">{l('• Reputation:', '• 声望：')}</strong>{' '}
                {l('Sum of all Victory Point values on tiles placed on the Reputation Track.', '声望轨上所有已放置声望板块的分值总和。')}
              </div>
              <div>
                <strong className="text-slate-200">{l('• Technologies:', '• 科技：')}</strong>{' '}
                {l(
                  'Researched technologies displaying a victory point crest icon (e.g. Advanced Labs +1 VP, Warp Portal, etc.).',
                  '已研发且带有胜利分徽章图标的科技（例如高级实验室 +1 VP、跃迁门等）。'
                )}
              </div>
              <div>
                <strong className="text-slate-200">{l('• Ambassadors:', '• 大使：')}</strong>{' '}
                {l('1 VP per diplomatic ambassador tile received from other species.', '每从其他种族获得 1 枚外交大使板块记 1 VP。')}
              </div>
              <div>
                <strong className="text-slate-200">{l('• Kept Discoveries:', '• 保留的探索板块：')}</strong>{' '}
                {l('2 VP per Discovery tile flipped and claimed for victory points.', '每枚翻面并作为胜利分保留的探索板块提供 2 VP。')}
              </div>
              <div>
                <strong className="text-slate-200">{l('• Planta Species Trait:', '• 植物人种族特性：')}</strong>{' '}
                {l('+1 additional bonus VP for each sector controlled with an Influence Disc.', '每用影响力圆片控制 1 个星区，额外获得 +1 VP。')}
              </div>
              <div>
                <strong className="text-slate-200">{l('• Draco Species Trait:', '• 天龙族种族特性：')}</strong>{' '}
                {l('+1 additional bonus VP for every Ancient ship surviving on the galaxy board.', '银河版图上每艘存活的远古舰船额外提供 +1 VP。')}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {l('Click any player row to view their board and empire status.', '点击任意玩家行可查看其帝国版图与状态。')}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 font-sans"
          >
            {l('Close Standings', '关闭积分榜')}
          </button>
        </div>
      </div>
    </div>
  );
};
