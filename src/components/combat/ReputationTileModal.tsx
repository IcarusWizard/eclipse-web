import React, { useState } from 'react';
import { GameState, PendingReputationDraw } from '../../engine/types/state';
import { Trophy, Shield, CheckCircle2, ArrowRight, RotateCcw, X, Users, Minimize2, Maximize2 } from 'lucide-react';
import {
  getMaxReputationTilesForPlayer,
  getPlayerReputationTrackSlots,
  getReputationTileEffectiveVP,
} from '../../engine/rules/setup';
import { useLanguage } from '../../i18n/LanguageContext';

interface ReputationTileModalProps {
  state: GameState;
  pendingDraw: PendingReputationDraw;
  onClaimTile: (selectedTileIndex?: number, replaceTrackIndex?: number) => void;
}

export const ReputationTileModal: React.FC<ReputationTileModalProps> = ({
  state,
  pendingDraw,
  onClaimTile,
}) => {
  const { l } = useLanguage();
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const player = state.players.find((p) => p.id === pendingDraw.playerId);
  const sector = state.sectors.find((s) => s.id === pendingDraw.sectorId);
  if (!player) return null;

  // Default selection to the drawn tile with the highest VP
  const defaultSelectedIdx = React.useMemo(() => {
    if (!pendingDraw.drawnTiles.length) return null;
    let bestIdx = 0;
    let maxVp = pendingDraw.drawnTiles[0] ?? 0;
    for (let i = 1; i < pendingDraw.drawnTiles.length; i++) {
      const val = pendingDraw.drawnTiles[i] ?? 0;
      if (val > maxVp) {
        maxVp = val;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [pendingDraw.drawnTiles]);

  // Default replacement to the tile on player's track with the lowest VP
  const defaultReplaceIdx = React.useMemo(() => {
    if (!player.reputationTiles.length) return 0;
    let worstIdx = 0;
    let minVp = player.reputationTiles[0] ?? 0;
    for (let i = 1; i < player.reputationTiles.length; i++) {
      const val = player.reputationTiles[i] ?? 0;
      if (val < minVp) {
        minVp = val;
        worstIdx = i;
      }
    }
    return worstIdx;
  }, [player.reputationTiles]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(defaultSelectedIdx);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(defaultReplaceIdx);

  const maxRepTiles = getMaxReputationTilesForPlayer(player);
  const isTrackFull = player.reputationTiles.length >= maxRepTiles;
  const trackSlots = getPlayerReputationTrackSlots(player, state.players);

  const handleConfirm = () => {
    if (selectedIndex === null) {
      onClaimTile(undefined, undefined);
    } else {
      onClaimTile(
        selectedIndex,
        isTrackFull && replaceIndex !== null ? replaceIndex : undefined
      );
    }
  };

  // Minimized floating banner at top
  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-amber-500 rounded-full shadow-2xl backdrop-blur-md text-white">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs sm:text-sm tracking-wide text-amber-300 font-display">
            {l(
              `REPUTATION DRAW: SECTOR ${sector?.sectorNumber || 'Unknown'} (${player.name})`,
              `声望板块抽取：星区 ${sector?.sectorNumber || '未知'} (${player.name})`
            )}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300">
            {l(`${pendingDraw.drawnTiles.length} DRAWN`, `已抽 ${pendingDraw.drawnTiles.length} 枚`)}
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-full text-xs font-bold transition-all shadow-md shadow-amber-950/50 flex items-center gap-1.5 cursor-pointer"
            title={l('Return to reputation selection', '返回声望板块选择')}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{l('Select Tile', '选择板块')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Side window (Bug 123)
  return (
    <div className="fixed top-18 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-125 max-w-xl pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 flex flex-col max-h-[calc(100vh-90px)]">
        {/* Header */}
        <div className="p-4 border-b border-amber-900/50 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-300 font-display">
                {l('REPUTATION TILE DRAW', '声望板块抽取')}
              </h2>
              <p className="text-xs text-slate-400">
                {l('Battle rewards in Sector ', '星区 ')}
                {sector?.sectorNumber || l('Unknown', '未知')}
                {l(' for ', ' 的战斗奖励（玩家：')}
                <strong className="text-slate-200">{player.name}</strong>
                {l('', '）')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300">
              {l(`${pendingDraw.drawnTiles.length} Drawn`, `已抽 ${pendingDraw.drawnTiles.length} 枚`)}
            </span>
            <button
              onClick={() => setIsMinimized(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors shadow-sm cursor-pointer"
              title={l('Minimize to inspect map', '最小化以查看地图')}
            >
              <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{l('View Map', '查看地图')}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Rules Explanation Banner */}
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3 text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-amber-300">
              {l('Select up to ONE tile to place on your Reputation Track:', '最多选择 1 枚声望板块放置到你的声望轨：')}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {l(
                'Earned for participating in fleet combat and destroying enemy vessels. Unselected tiles will be returned to the Reputation Bag.',
                '因参与舰队战斗及击毁敌舰而获得。未选择的板块将放回声望袋。'
              )}
            </p>
          </div>

          {state.expansions?.includes('community_balance') && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2.5 text-xs text-emerald-200 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {l('Community Balance: Draw Cap', '社区平衡变体：抽取上限')}
              </span>
              <span className="font-mono text-[11px] bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 px-2 py-0.5 rounded font-bold">
                {l(`Max ${pendingDraw.drawnTiles.length} VP`, `最多 ${pendingDraw.drawnTiles.length} 枚`)}
              </span>
            </div>
          )}

          {player.faction.id === 'kurita_prefecture' && pendingDraw.isBattleWin !== undefined && (
            <div
              data-testid="kurita-honour-rep-banner"
              className={`rounded-xl p-2.5 text-xs border flex items-center justify-between ${
                pendingDraw.isBattleWin
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              }`}
            >
              <span className="font-bold">
                {pendingDraw.isBattleWin
                  ? l('Honour the Victorious: Battle Won (+1 VP Dmg Cube)', '胜战荣耀：战斗获胜（+1 VP 伤害方块）')
                  : l('Honour the Victorious: Battle Lost (-1 VP Penalty)', '败战受辱：战斗失利（-1 VP 惩罚）')}
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded font-black bg-slate-950/70 border border-current/30">
                {pendingDraw.isBattleWin ? '+1 VP' : '-1 VP'}
              </span>
            </div>
          )}

          {/* Drawn Tiles Options */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {l('Drawn Reputation Tiles (Choose 1)', '抽到的声望板块（选择 1 枚）')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pendingDraw.drawnTiles.map((vp, idx) => {
                const isSelected = selectedIndex === idx;
                const kuritaOutcome =
                  player.faction.id === 'kurita_prefecture' && pendingDraw.isBattleWin !== undefined
                    ? pendingDraw.isBattleWin
                      ? 'win'
                      : 'loss'
                    : undefined;
                const effectiveVp = getReputationTileEffectiveVP(player, vp, -1, kuritaOutcome);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/60 border-amber-400 shadow-lg shadow-amber-950/60 ring-2 ring-amber-400/80'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-2xl font-black font-display text-amber-300">
                      {effectiveVp} VP
                    </span>
                    <span className="text-[10px] uppercase font-mono text-slate-400">
                      {kuritaOutcome === 'win'
                        ? l(`Tile ${vp} + 1 Win Cube`, `原 ${vp} + 1 胜战`)
                        : kuritaOutcome === 'loss'
                        ? l(`Tile ${vp} - 1 Loss`, `原 ${vp} - 1 败战`)
                        : l('Reputation Tile', '声望板块')}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 uppercase tracking-tight">
                        {l('Selected', '已选择')}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Option to decline taking any tile */}
              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedIndex === null
                    ? 'bg-slate-800 border-slate-500 ring-2 ring-slate-400'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <X className="w-6 h-6 text-slate-400" />
                <span className="text-xs font-bold text-slate-300">{l('Decline All', '全部放弃')}</span>
                <span className="text-[9px] text-slate-500">{l('Keep nothing', '不保留任何板块')}</span>
              </button>
            </div>
          </div>

          {/* Current Player Reputation Track (Bug 78) */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan-400" /> {l('Current Reputation Track', '当前声望轨')}
              </span>
              <span className="font-mono text-slate-400">
                {l('Rep Capacity:', '声望容量：')} <strong className="text-amber-300">{player.reputationTiles.length}</strong> / {maxRepTiles}
                {(player.ambassadorTiles?.length || 0) > 0 && (
                  <span className="text-indigo-400 ml-1.5 font-sans font-semibold">
                    {l(
                      `(${player.ambassadorTiles.length} Ambassador${player.ambassadorTiles.length > 1 ? 's' : ''})`,
                      `(${player.ambassadorTiles.length} 枚大使)`
                    )}
                  </span>
                )}
              </span>
            </div>

            <div className={`grid ${trackSlots.length === 4 ? 'grid-cols-4' : 'grid-cols-5'} gap-2`}>
              {trackSlots.map((slot) => {
                const isAmbassador = slot.tile?.type === 'ambassador';
                const isReputation = slot.tile?.type === 'reputation';
                const isSelectedToReplace =
                  isTrackFull && isReputation && replaceIndex === slot.tile?.repIndex;

                return (
                  <div
                    key={slot.slotIndex}
                    onClick={() => {
                      if (isTrackFull && isReputation) {
                        setReplaceIndex(slot.tile!.repIndex);
                      }
                    }}
                    className={`min-h-[72px] rounded-xl border flex flex-col items-center justify-between p-1.5 relative transition-all ${
                      isSelectedToReplace
                        ? 'bg-rose-950/60 border-rose-400 shadow ring-2 ring-rose-400 cursor-pointer'
                        : isAmbassador
                        ? 'bg-indigo-950/40 border-indigo-500/70 shadow'
                        : isReputation
                        ? 'bg-slate-900 border-amber-600/70 shadow'
                        : 'bg-slate-950 border-dashed border-slate-800 text-slate-600'
                    } ${isTrackFull && isReputation ? 'cursor-pointer hover:border-rose-400/80' : ''}`}
                  >
                    <div className="w-full flex items-center justify-between text-[9px] text-slate-500 font-mono">
                      <span>#{slot.slotIndex + 1}</span>
                      <span className="text-[8px] uppercase font-bold text-slate-400">
                        {slot.slotType === 'amb_only'
                          ? l('Amb Only', '仅限大使')
                          : slot.slotType === 'rep_only'
                          ? l('Rep Only', '仅限声望')
                          : l('Amb / Rep', '大使/声望')}
                      </span>
                    </div>

                    {isAmbassador ? (
                      <div className="flex flex-col items-center justify-center my-0.5 text-center">
                        <div className="flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full border border-white/40 shrink-0"
                            style={{ backgroundColor: slot.tile?.allyColor }}
                          />
                          <span className="text-[10px] font-bold text-indigo-300 truncate max-w-[65px]">
                            {slot.tile?.allyName}
                          </span>
                        </div>
                        <span className="text-[9px] font-black text-indigo-400 font-mono">
                          {l('+1 VP Amb', '+1 VP 大使')}
                        </span>
                      </div>
                    ) : slot.tile?.type === 'reputation' ? (
                      <div className="flex flex-col items-center justify-center my-0.5">
                        <span className="text-base font-black font-display text-amber-300">
                          {slot.tile.effectiveVp ?? slot.tile.vp} VP
                        </span>
                        {slot.tile.battleOutcome === 'win' && (
                          <span className="text-[8px] font-bold text-emerald-300 font-mono">
                            {l(`${slot.tile.vp}+1 Cube`, `${slot.tile.vp}+1 胜`)}
                          </span>
                        )}
                        {slot.tile.battleOutcome === 'loss' && (
                          <span className="text-[8px] font-bold text-rose-300 font-mono">
                            {l(`${slot.tile.vp}-1 Loss`, `${slot.tile.vp}-1 败`)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-600 italic my-auto">{l('Empty', '空位')}</span>
                    )}

                    <div className="w-full flex justify-center min-h-[14px]">
                      {isSelectedToReplace ? (
                        <span className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-rose-500 text-white shadow">
                          {l('Replace', '替换')}
                        </span>
                      ) : isAmbassador ? (
                        <span className="text-[7.5px] font-semibold text-indigo-400/90 uppercase tracking-tight">
                          {l('Pact (Locked)', '盟约（锁定）')}
                        </span>
                      ) : isTrackFull && isReputation ? (
                        <span className="text-[7.5px] text-slate-400">
                          {l('Click to swap', '点击替换')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {isTrackFull && selectedIndex !== null && (
              <p className="text-[11px] text-amber-400/90 italic">
                {l(
                  '* Your reputation capacity is reached. Click one of your existing reputation tiles above to replace it (ambassador pacts cannot be replaced), or decline the drawn tile.',
                  '* 你的声望容量已满。点击上方一枚现有声望板块进行替换（大使盟约不可替换），或放弃本次抽取的板块。'
                )}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onClaimTile(undefined, undefined)}
            className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
          >
            {l('Decline & Return All', '全部放弃并放回')}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-950 transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            {selectedIndex !== null ? l('Confirm Reputation Tile', '确认选取声望板块') : l('Decline All Tiles', '放弃所有板块')}
          </button>
        </div>
      </div>
    </div>
  );
};
