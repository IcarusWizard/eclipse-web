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
                <span>Live Galactic Standings & Victory Points</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-950 border border-amber-700 text-amber-300">
                  Round {state.round} / {state.maxRounds}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Calculates current live scoring if the game were to conclude right now, per official Second Dawn rules.
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
                  <th className="py-3 px-4 text-center w-14">Rank</th>
                  <th className="py-3 px-4">Commander & Faction</th>
                  <th className="py-3 px-3 text-center" title="Victory Points from Controlled Sectors">
                    <div className="flex items-center justify-center gap-1">
                      <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Sectors</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center" title="3 VP per Monolith in controlled sectors">
                    <div className="flex items-center justify-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Monoliths</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center" title="Reputation Tiles placed on the track">
                    <div className="flex items-center justify-center gap-1">
                      <Award className="w-3.5 h-3.5 text-rose-400" />
                      <span>Reputation</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center" title="Victory Points printed on Researched Techs">
                    <div className="flex items-center justify-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-pink-400" />
                      <span>Techs</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center" title="1 VP per Ambassador Tile">
                    <div className="flex items-center justify-center gap-1">
                      <Users2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ambass.</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center" title="2 VP per Kept Discovery Tile & Warp Portals">
                    <div className="flex items-center justify-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Discoveries</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center" title="Species-specific endgame bonuses (Planta sector VP, Draco Ancient VP)">
                    <div className="flex items-center justify-center gap-1">
                      <span>Species Trait</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right font-black text-amber-400">Total VP</th>
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
                                  Leader
                                </span>
                              )}
                              {Boolean(b.traitor && b.traitor < 0) && (
                                <span className="text-[10px] text-rose-300 font-semibold px-1.5 py-0.2 bg-rose-950/80 border border-rose-800 rounded">
                                  Traitor (-2 VP)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{player.faction.name}</div>
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
                              title={`${player.reputationTiles.length} secret reputation tile(s)`}
                            >
                              ? ({player.reputationTiles.length} {player.reputationTiles.length === 1 ? 'tile' : 'tiles'})
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
                            title="Total known VP plus secret opponent reputation tiles"
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
              <span>Eclipse: Second Dawn Official Scoring Breakdown</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-400 text-[11px] leading-relaxed">
              <div>
                <strong className="text-slate-200">• Sectors:</strong> Sum of VP printed on controlled sectors (e.g., GCDS = 4 VP, Inner = 2-3 VP, Outer = 1-2 VP).
              </div>
              <div>
                <strong className="text-slate-200">• Monoliths:</strong> Each built Monolith in a controlled sector yields 3 VP.
              </div>
              <div>
                <strong className="text-slate-200">• Reputation:</strong> Sum of all Victory Point values on tiles placed on the Reputation Track.
              </div>
              <div>
                <strong className="text-slate-200">• Technologies:</strong> Researched technologies displaying a victory point crest icon (e.g. Advanced Labs +1 VP, Warp Portal, etc.).
              </div>
              <div>
                <strong className="text-slate-200">• Ambassadors:</strong> 1 VP per diplomatic ambassador tile received from other species.
              </div>
              <div>
                <strong className="text-slate-200">• Kept Discoveries:</strong> 2 VP per Discovery tile flipped and claimed for victory points.
              </div>
              <div>
                <strong className="text-slate-200">• Planta Species Trait:</strong> +1 additional bonus VP for each sector controlled with an Influence Disc.
              </div>
              <div>
                <strong className="text-slate-200">• Draco Species Trait:</strong> +1 additional bonus VP for every Ancient ship surviving on the galaxy board.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Click any player row to view their board and empire status.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 font-sans"
          >
            Close Standings
          </button>
        </div>
      </div>
    </div>
  );
};
