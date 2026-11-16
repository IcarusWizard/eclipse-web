import React, { useState } from 'react';
import { GameState } from '../../engine/types/state';
import { getFactionDisplayColor } from '../../engine/rules/gameReducer';
import { Trophy, Award, Star, Home, Eye, Minimize2, Maximize2, History } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateFactionName } from '../../i18n/catalogTranslations';

interface GameOverModalProps {
  state: GameState;
  onNewGame?: () => void;
  onExitToLobby?: () => void;
  onReplayGame?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ state, onExitToLobby, onReplayGame }) => {
  const { l, language } = useLanguage();
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const winner = state.players.find((p) => p.id === state.winnerId);
  const scores = state.finalScores || {};

  // Minimized floating banner allowing players to inspect the map and boards (Bug 124)
  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-amber-500 rounded-full shadow-2xl backdrop-blur-md text-white">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs sm:text-sm tracking-wide text-amber-300 font-display">
            {l('GAME OVER:', '游戏结束：')}{' '}
            {winner
              ? l(
                  `${winner.name} Victorious (${scores[winner.id]?.total || 0} VP)`,
                  `${winner.name} 获胜 (${scores[winner.id]?.total || 0} VP)`
                )
              : l('Galactic Supremacy Concluded', '银河霸权决战已结束')}
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-full text-xs font-bold transition-all shadow-md shadow-amber-950/50 flex items-center gap-1.5 cursor-pointer"
            title={l('Return to final scores and end-game summary', '返回最终得分与终局统计')}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{l('Show Scores', '查看得分')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/60 rounded-2xl w-full max-w-4xl shadow-2xl p-6 text-slate-100 flex flex-col items-center text-center relative max-h-[95vh] overflow-y-auto">
        {/* Top bar with Examine Board button */}
        <div className="w-full flex items-center justify-end mb-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 hover:border-amber-500 transition-all shadow-sm cursor-pointer"
            title={l('Minimize to examine galaxy board', '最小化以查看银河版图')}
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span>{l('Examine Board', '查看星盘')}</span>
          </button>
        </div>
        <Trophy className="w-16 h-16 text-amber-400 mb-3 animate-bounce" />
        <h2 className="text-2xl font-extrabold text-amber-300 font-display">
          {l('GALACTIC SUPREMACY ACHIEVED!', '银河霸业达成！')}
        </h2>
        <p className="text-sm text-slate-400 mt-1 mb-6">
          {l(
            '8 Rounds of deep space exploration and empire building have concluded.',
            '历时 8 轮的深空探索与帝国扩张已落下帷幕。'
          )}
        </p>

        {winner && (
          <div className="bg-slate-950/80 border border-amber-500/40 rounded-xl p-4 w-full mb-6">
            <div className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">
              {l('Galactic Hegemon', '银河霸主')}
            </div>
            <div className="text-xl font-bold font-display text-white" style={{ color: getFactionDisplayColor(winner.color, winner.faction?.name) }}>
              {winner.name}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {l('Victorious with ', '以 ')}
              <strong className="text-amber-300 font-bold">
                {l(`${scores[winner.id]?.total || 0} Total VP`, `${scores[winner.id]?.total || 0} 总分`)}
              </strong>
              {l('', ' 夺得胜利')}
            </div>
          </div>
        )}

        {/* Scores Table */}
        <div className="w-full bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto mb-6">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">{l('Commander', '指挥官')}</th>
                <th className="p-3 text-center">{l('Sectors', '星区')}</th>
                <th className="p-3 text-center">{l('Monoliths', '纪念碑')}</th>
                <th className="p-3 text-center">{l('Reputation', '声望')}</th>
                <th className="p-3 text-center">{l('Tech', '科技')}</th>
                <th className="p-3 text-center">{l('Ambassadors', '大使')}</th>
                <th className="p-3 text-center">{l('Discoveries', '探索板块')}</th>
                <th className="p-3 text-center" title={l('Planta controlled sector bonus, Draco ancient bonus', '植物人控制星区加成、天龙族远古加成')}>
                  {l('Species Trait', '种族特性')}
                </th>
                <th className="p-3 text-right font-bold text-amber-400">{l('Total VP', '总分 VP')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {state.players.map((p) => {
                const s = scores[p.id];
                const isWinner = p.id === state.winnerId;

                return (
                  <tr key={p.id} className={isWinner ? 'bg-amber-950/20 font-bold' : ''}>
                    <td className="p-3 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <div>
                        <div className="text-slate-200 flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {s?.traitor ? (
                            <span className="text-[10px] text-rose-300 font-bold px-1.5 py-0.2 bg-rose-950/80 border border-rose-800 rounded">
                              {l('Traitor (-2 VP)', '叛徒 (-2 VP)')}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {translateFactionName(p.faction.id, p.faction.name, language)}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center text-slate-400">{s?.sectors || 0}</td>
                    <td className="p-3 text-center text-slate-400">{s?.monoliths || 0}</td>
                    <td className="p-3 text-center text-slate-400">{s?.reputation || 0}</td>
                    <td className="p-3 text-center text-slate-400">{s?.techs || 0}</td>
                    <td className="p-3 text-center text-slate-400">{s?.ambassadors || 0}</td>
                    <td className="p-3 text-center text-slate-400">{s?.discoveries || 0}</td>
                    <td className="p-3 text-center font-mono">
                      {(s?.speciesBonus || 0) > 0 ? (
                        <span className="text-emerald-400 font-bold">+{s?.speciesBonus}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-amber-300 text-sm">
                      {s?.total || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm uppercase tracking-wider border border-slate-700 hover:border-amber-500 transition-all shadow-lg cursor-pointer"
          >
            <Eye className="w-4 h-4 text-amber-400" /> {l('Examine Board', '查看星盘')}
          </button>
          {onExitToLobby && (
            <button
              onClick={onExitToLobby}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm uppercase tracking-wider border border-slate-700 hover:border-cyan-500 transition-all shadow-lg cursor-pointer"
            >
              <Home className="w-4 h-4 text-cyan-400" /> {l('Exit to Lobby', '返回大厅')}
            </button>
          )}
          {onReplayGame && (
            <button
              onClick={onReplayGame}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm uppercase tracking-wider border border-indigo-500 shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
            >
              <History className="w-4 h-4 text-indigo-200" /> {l('Replay Game', '对局回放')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
