import React from 'react';
import { PlayerState } from '../../engine/types/player';
import { getMidasTouchCost, MidasTouchActionType } from '../../engine/rules/gameReducer';
import { Coins, Sparkles } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface MidasTouchBannerProps {
  player: PlayerState;
  actionType: MidasTouchActionType;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Shared toggle banner allowing Legion of Midas to spend Gold BEFORE performing an action
 * for +1 activation of that same type (+1 Gold cost when <=7 action discs remain).
 */
export const MidasTouchBanner: React.FC<MidasTouchBannerProps> = ({
  player,
  actionType,
  enabled,
  onToggle,
  disabled = false,
  className = '',
}) => {
  const { l } = useLanguage();
  if (player.faction.id !== 'legion_of_midas') return null;

  const cost = getMidasTouchCost(player, actionType);
  const hasLowDiscSurcharge = player.influenceTrack.discsOnTrack <= 7;
  const canAfford = player.resources.money >= cost;
  const isDisabled = disabled || (!enabled && !canAfford);

  return (
    <div
      data-testid="midas-touch-banner"
      className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2.5 transition-all ${
        enabled
          ? 'bg-amber-950/65 border-amber-400 text-amber-100 shadow-sm shadow-amber-950/40'
          : 'bg-slate-950/75 border-amber-700/50 text-slate-200'
      } ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className={`w-4 h-4 shrink-0 ${enabled ? 'text-amber-300 animate-pulse' : 'text-amber-400'}`} />
        <div className="min-w-0">
          <div className="font-bold text-amber-200 flex items-center gap-1.5 flex-wrap">
            <span>{l('Midas Touch (+1 Activation)', '点金手 (+1 次激活)')}</span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-900/70 border border-amber-600/60 text-amber-200 font-mono text-[10px]">
              {cost} <Coins className="w-2.5 h-2.5 text-yellow-300" />
            </span>
            {hasLowDiscSurcharge && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/80 border border-rose-700/70 text-rose-300 font-semibold">
                {l('≤7 Discs (+1 Cost)', '≤7 圆片 (+1 费)')}
              </span>
            )}
          </div>
          <p className="text-[10.5px] text-slate-300/90 leading-snug">
            {actionType === 'INFLUENCE'
              ? l(
                  `Spend ${cost} Gold to gain +1 Influence disc movement (Colony Ship refreshes remain 2).`,
                  `花费 ${cost} 金钱获得 +1 枚影响力圆片移动（殖民船翻正仍为 2 艘）。`
                )
              : l(
                  `Spend ${cost} Gold to gain +1 ${actionType.toLowerCase()} activation on this action.`,
                  `花费 ${cost} 金钱使本次行动获得 +1 次激活。`
                )}
          </p>
        </div>
      </div>

      <button
        type="button"
        data-testid="midas-touch-toggle"
        disabled={isDisabled}
        onClick={() => onToggle(!enabled)}
        className={`px-3 py-1.5 rounded-lg font-bold text-[11px] shrink-0 border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          enabled
            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 shadow'
            : canAfford
            ? 'bg-amber-950/80 hover:bg-amber-900 text-amber-200 border-amber-600/70'
            : 'bg-slate-900 text-slate-500 border-slate-800'
        }`}
      >
        {enabled
          ? l('ACTIVE (+1)', '已开启 (+1)')
          : canAfford
          ? l(`Spend ${cost}G (+1)`, `花费 ${cost}金 (+1)`)
          : l(`Need ${cost}G`, `需 ${cost}金`)}
      </button>
    </div>
  );
};
