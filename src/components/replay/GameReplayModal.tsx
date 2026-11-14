import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GameState } from '../../engine/types/state';
import { SectorTile } from '../../engine/types/galaxy';
import { isReplayAvailable, resolveStepState } from '../../engine/rules/replay';
import { getPlayerShortName, getPlayerDisplayName } from '../../engine/rules/gameReducer';
import { HexGalaxyMap } from '../map/HexGalaxyMap';
import { CombatDieFaceGraphic } from '../common/PhysicalTileIconography';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  translateGamePhase,
  translateShipType,
} from '../../i18n/catalogTranslations';
import {
  History,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  X,
  Gauge,
  Info,
  CheckCircle2,
  AlertTriangle,
  Swords,
} from 'lucide-react';

export interface GameReplayModalProps {
  state: GameState;
  tableNumber?: number;
  onClose: () => void;
}

export const GameReplayModal: React.FC<GameReplayModalProps> = ({
  state,
  tableNumber,
  onClose,
}) => {
  const { l, language } = useLanguage();
  const replayAvailable = isReplayAvailable(state);

  // If no replay tracking data exists (older games / backward compatibility)
  if (!replayAvailable) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-amber-500/60 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-100 flex flex-col items-center text-center relative animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title={l('Close', '关闭')}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 rounded-full bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-950/50">
            <History className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-amber-300 font-display mb-2">
            {l('Replay Not Available', '回放不可用')}
          </h3>
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 mb-6 leading-relaxed text-left space-y-2">
            <p className="font-semibold text-amber-200/90 flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{l('Replay is not available for this game (created before replay tracking was enabled).', '此对局无回放记录（创建于回放追踪功能启用之前）。')}</span>
            </p>
            <p className="text-slate-400 pl-5.5">
              {l('Historical action tracking requires step snapshots recorded during gameplay. Older games created prior to action tracking do not have historical snapshots saved.', '历史行动追踪需要游玩过程中记录的步进快照。早于该功能创建的旧对局未保存历史快照。')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer border border-slate-700 hover:border-slate-500 shadow"
          >
            {l('Close Replay', '关闭回放')}
          </button>
        </div>
      </div>
    );
  }

  const steps = state.replaySteps || [];
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [selectedSector, setSelectedSector] = useState<SectorTile | null>(null);

  const totalSteps = steps.length;
  const currentStep = steps[stepIndex] || steps[0];

  // In-memory cache for reconstructed states to keep seek & scrub latency at 0ms
  const stateCacheRef = useRef<Map<number, GameState>>(new Map());

  // Reconstruct GameState from keyframe snapshot + sequential deltas at this step
  const stepState: GameState = useMemo(() => {
    try {
      if (steps.length === 0) return state;
      return resolveStepState(steps, stepIndex, stateCacheRef.current);
    } catch (err) {
      console.error('Failed to resolve replay step state:', err);
      return state;
    }
  }, [steps, stepIndex, state]);

  // Synchronize selectedSector reference with the new stepState
  useEffect(() => {
    if (selectedSector && stepState.sectors) {
      const match = stepState.sectors.find((s) => s.id === selectedSector.id);
      if (match) setSelectedSector(match);
    }
  }, [stepState]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    if (stepIndex >= totalSteps - 1) {
      setIsPlaying(false);
      return;
    }

    const intervalMs = playbackSpeed === 4 ? 400 : playbackSpeed === 2 ? 800 : 1500;
    const timer = setTimeout(() => {
      setStepIndex((idx) => {
        if (idx + 1 >= totalSteps - 1) {
          setIsPlaying(false);
          return totalSteps - 1;
        }
        return idx + 1;
      });
    }, intervalMs);

    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, totalSteps, playbackSpeed]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setStepIndex((idx) => Math.max(0, idx - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setStepIndex((idx) => Math.min(totalSteps - 1, idx + 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((playing) => {
          if (!playing && stepIndex >= totalSteps - 1) {
            setStepIndex(0);
            return true;
          }
          return !playing;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        setIsPlaying(false);
        setStepIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setIsPlaying(false);
        setStepIndex(totalSteps - 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSteps, stepIndex, onClose]);

  const handleTogglePlay = () => {
    if (!isPlaying && stepIndex >= totalSteps - 1) {
      setStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleCycleSpeed = () => {
    if (playbackSpeed === 1) setPlaybackSpeed(2);
    else if (playbackSpeed === 2) setPlaybackSpeed(4);
    else setPlaybackSpeed(1);
  };

  const actorPlayer = stepState.players?.find((p) => p.id === currentStep?.actorPlayerId);
  const effectiveTableNum = tableNumber || (state as any).tableNumber;

  const isCombatStep =
    currentStep?.actionType === 'RESOLVE_COMBAT_STEP' ||
    Boolean(stepState.activeCombat?.lastRolls?.length) ||
    Boolean(currentStep?.summary?.includes('⚔️') || currentStep?.summary?.includes('salvo'));
  const lastRolls = stepState.activeCombat?.lastRolls || [];
  const destroyedShips = stepState.activeCombat?.destroyedShips || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <header className="h-14 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between text-slate-100 z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title={l('Exit Replay (Esc)', '退出回放 (Esc)')}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-indigo-950 border border-indigo-700 text-indigo-300">
              #{effectiveTableNum || l('MATCH', '对局')}
            </span>
            <div className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-400" />
              <span className="font-extrabold text-sm text-indigo-200 font-display hidden sm:inline">
                {l('GALACTIC REPLAY', '星海回放')}
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          {/* Round & Phase Badges */}
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
              R{stepState.round}/{stepState.maxRounds}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800/80 text-cyan-300 border border-cyan-800/60 hidden sm:inline">
              {translateGamePhase(stepState.phase, language)}
            </span>
          </div>
        </div>

        {/* Center: Current Step Summary */}
        <div className="flex-1 max-w-xl mx-4 hidden lg:flex items-center justify-center">
          <div className="w-full px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs truncate">
            {actorPlayer && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: actorPlayer.color }}
              />
            )}
            <span className="font-bold text-slate-200 shrink-0">
              {currentStep?.actionType}:
            </span>
            <span className="text-slate-300 truncate" title={currentStep?.summary}>
              {currentStep?.summary}
            </span>
          </div>
        </div>

        {/* Right: Step Counter */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-800/90 text-amber-300 border border-slate-700">
            {l(`Step ${stepIndex + 1} / ${totalSteps}`, `第 ${stepIndex + 1} / ${totalSteps} 步`)}
          </span>
        </div>
      </header>

      {/* Main Map View Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <HexGalaxyMap
          state={stepState}
          selectedSectorId={selectedSector?.id || null}
          onSelectSector={(s) => setSelectedSector(s)}
        />

        {/* Floating Combat Step Details Card (Bug 211) */}
        {isCombatStep && (
          <div className="absolute top-4 left-4 z-20 max-w-sm sm:max-w-md bg-slate-950/95 border border-rose-500/50 rounded-xl shadow-2xl p-3 text-xs text-slate-200 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-1.5 border-b border-rose-900/50 mb-2">
              <div className="flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-rose-400" />
                <span className="font-bold text-rose-300 uppercase tracking-wider text-xs">
                  {l('Combat Salvo', '战斗齐射')}{' '}
                  {stepState.activeCombat?.sectorId
                    ? l(`• Sector ${stepState.activeCombat.sectorId}`, `• 星区 ${stepState.activeCombat.sectorId}`)
                    : ''}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-mono text-[10px] font-bold border border-rose-800">
                {l(`Round ${stepState.activeCombat?.roundNumber || stepState.round}`, `第 ${stepState.activeCombat?.roundNumber || stepState.round} 轮`)}
              </span>
            </div>

            {/* Salvo rolls display */}
            {lastRolls.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
                  <span>{l('Dice Rolled & Damage', '骰面与伤害')}</span>
                  <span className="text-amber-300 font-mono font-bold">
                    {lastRolls.filter((r) => r.isHit).length} {l('Hit(s)', '命中')} •{' '}
                    {lastRolls.reduce((sum, r) => sum + (r.isHit ? r.damage : 0), 0)} {l('Dmg', '伤害')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-1.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  {lastRolls.map((roll, rIdx) => {
                    const dieBg =
                      roll.dieColor === 'red'
                        ? 'bg-red-950 border-red-500 text-red-200'
                        : roll.dieColor === 'blue'
                        ? 'bg-blue-950 border-blue-500 text-blue-200'
                        : roll.dieColor === 'orange'
                        ? 'bg-amber-950 border-amber-500 text-amber-200'
                        : roll.dieColor === 'purple'
                        ? 'bg-purple-950 border-purple-500 text-purple-200'
                        : 'bg-yellow-950 border-yellow-500 text-yellow-200';

                    return (
                      <div
                        key={rIdx}
                        className={`flex items-center gap-1 px-2 py-1 rounded border font-mono text-xs font-bold ${dieBg} ${
                          roll.isHit ? 'ring-1 ring-emerald-400' : 'opacity-60'
                        }`}
                        title={
                          language === 'zh'
                            ? `${roll.dieColor.toUpperCase()} 骰: 掷出 ${roll.roll} (修正: ${roll.modifiedRoll}) -> ${roll.isHit ? `命中 (${roll.damage} 伤害)` : '未命中'}`
                            : `${roll.dieColor.toUpperCase()} Die: Rolled ${roll.roll} (Mod: ${roll.modifiedRoll}) -> ${roll.isHit ? `HIT (${roll.damage} dmg)` : 'MISS'}`
                        }
                      >
                        <CombatDieFaceGraphic color={roll.dieColor} roll={roll.roll} size="xs" />
                        <span>{roll.roll}</span>
                        <span>{roll.isHit ? '✓' : '✗'}</span>
                        {roll.isHit && (
                          <span className="text-[10px] text-emerald-400 font-bold">
                            +{roll.damage}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Damage Assignment & Summary */}
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] leading-relaxed text-slate-300">
              <span className="font-semibold text-slate-100">{currentStep?.summary}</span>
            </div>

            {/* Casualties / Destroyed Ships */}
            {destroyedShips.length > 0 && (
              <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center gap-1.5 flex-wrap text-[10px]">
                <span className="font-bold text-rose-400">{l('Casualties:', '战损：')}</span>
                {destroyedShips.map((des, dIdx) => (
                  <span
                    key={dIdx}
                    className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 font-mono font-bold"
                  >
                    💥 {des.ownerId} {language === 'zh' ? translateShipType(des.type, 'zh') : des.type.toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Floating Sector Detail Popup on Map Click */}
        {selectedSector && (
          <div className="absolute top-4 right-4 z-20 max-w-xs bg-slate-900/95 border border-indigo-500/40 rounded-xl shadow-2xl p-3 text-xs text-slate-200 backdrop-blur-md">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
              <span className="font-bold text-indigo-300">
                {l(`Sector ${selectedSector.sectorNumber}`, `星区 ${selectedSector.sectorNumber}`)} ({selectedSector.name || l('Deep Space', '深空')})
              </span>
              <button
                onClick={() => setSelectedSector(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              <div>
                {l('Controlled By:', '控制者：')}{' '}
                <strong className="text-white">
                  {selectedSector.discOwner
                    ? stepState.players.find((p) => p.id === selectedSector.discOwner)?.name || selectedSector.discOwner
                    : l('Unclaimed', '未占领')}
                </strong>
              </div>
              <div>
                {l('Ships Present:', '驻留舰船：')}{' '}
                <strong className="text-white">
                  {selectedSector.ships?.length || 0}
                </strong>
              </div>
              {selectedSector.planets && selectedSector.planets.length > 0 && (
                <div>
                  {l(`Planets (${selectedSector.planets.length}):`, `行星 (${selectedSector.planets.length})：`)}{' '}
                  <span className="text-slate-300 font-mono">
                    {selectedSector.planets
                      .map((p) => `${p.resource}${p.colonizedBy ? l(' (colonized)', ' (已殖民)') : ''}`)
                      .join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Console: Action Banner, Controls, Scrubber & Player Standings */}
      <footer className="bg-slate-900/95 border-t border-slate-800 p-3 flex flex-col gap-2.5 z-30 shrink-0">
        {/* Mobile/Compact Action Summary Banner */}
        <div className="lg:hidden px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs truncate">
          {actorPlayer && (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: actorPlayer.color }}
            />
          )}
          <span className="font-bold text-slate-200 shrink-0">
            {currentStep?.actionType}:
          </span>
          <span className="text-slate-300 truncate" title={currentStep?.summary}>
            {currentStep?.summary}
          </span>
        </div>

        {/* Scrubber Range Slider */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
            0 ({l('Setup', '开局')})
          </span>
          <input
            type="range"
            min={0}
            max={totalSteps - 1}
            value={stepIndex}
            onChange={(e) => {
              setStepIndex(Number(e.target.value));
              setIsPlaying(false);
            }}
            className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
          />
          <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
            {totalSteps - 1} ({l('Latest', '最新')})
          </span>
        </div>

        {/* Playback Controls & Player Strip */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Media Playback Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setIsPlaying(false);
                setStepIndex(0);
              }}
              disabled={stepIndex === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition cursor-pointer"
              title={l('Jump to Start (Home)', '跳至开头 (Home)')}
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setStepIndex((i) => Math.max(0, i - 1));
              }}
              disabled={stepIndex === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition cursor-pointer"
              title={l('Step Back (Left Arrow)', '上一步 (左方向键)')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleTogglePlay}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
              title={isPlaying ? l('Pause (Space)', '暂停 (空格)') : l('Play (Space)', '播放 (空格)')}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isPlaying ? l('Pause', '暂停') : l('Play', '播放')}</span>
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setStepIndex((i) => Math.min(totalSteps - 1, i + 1));
              }}
              disabled={stepIndex >= totalSteps - 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition cursor-pointer"
              title={l('Step Forward (Right Arrow)', '下一步 (右方向键)')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setStepIndex(totalSteps - 1);
              }}
              disabled={stepIndex >= totalSteps - 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition cursor-pointer"
              title={l('Jump to End (End)', '跳至末尾 (End)')}
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Speed Toggle */}
            <button
              onClick={handleCycleSpeed}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 font-mono font-bold text-xs flex items-center gap-1 transition cursor-pointer ml-1"
              title={l('Playback Speed', '播放倍速')}
            >
              <Gauge className="w-3 h-3 text-indigo-400" />
              <span>{playbackSpeed}x</span>
            </button>
          </div>

          {/* Mini Player Standings Strip */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
            {stepState.players?.map((p, pIdx) => {
              const isTurn = stepState.activePlayerIndex === pIdx;
              const hasPassed = p.hasPassed || stepState.passedPlayerIds?.includes(p.id);

              return (
                <div
                  key={p.id}
                  className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                    isTurn
                      ? 'bg-amber-950/60 border-amber-400 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-bold text-slate-200">
                    {getPlayerDisplayName(p, { short: true })}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                    <span title={l('Credits (Money)', '信用点 (金钱)')} className="text-amber-400">💰{p.resources?.money ?? 0}</span>
                    <span title={l('Science', '科技')} className="text-cyan-400">🧪{p.resources?.science ?? 0}</span>
                    <span title={l('Materials', '材料')} className="text-rose-400">🔨{p.resources?.materials ?? 0}</span>
                  </div>
                  {hasPassed && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-400">
                      {l('PASSED', '已跳过')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
};
