import React from 'react';
import { PlayerState } from '../../engine/types/player';
import { Sparkles, Hammer, Wrench, Rocket } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export type JotunnDreadNoughtTarget = 'same' | 'build' | 'upgrade' | 'move';

interface JotunnDreadNoughtBannerProps {
  player: PlayerState;
  primaryAction: 'UPGRADE' | 'BUILD' | 'MOVE';
  selectedTarget: JotunnDreadNoughtTarget;
  onSelectTarget: (next: JotunnDreadNoughtTarget) => void;
  disableCrossSwitch?: boolean;
  disableReason?: string;
  className?: string;
}

/**
 * Shared selector banner for Jotunn's Dread Nought ability on BUI, UPG, and MOV actions:
 * spend the +1 special activation as either +1 of the same action type OR 1 BUI/UPG/MOV on a Dreadnought.
 */
export const JotunnDreadNoughtBanner: React.FC<JotunnDreadNoughtBannerProps> = ({
  player,
  primaryAction,
  selectedTarget,
  onSelectTarget,
  disableCrossSwitch = false,
  disableReason,
  className = '',
}) => {
  const { l } = useLanguage();
  if (player.faction.id !== 'jotunn') return null;

  const sameLabel =
    primaryAction === 'UPGRADE'
      ? l('+1 Upgrade', '+1 升级')
      : primaryAction === 'BUILD'
      ? l('+1 Build', '+1 建造')
      : l('+1 Move', '+1 移动');

  const options: {
    key: JotunnDreadNoughtTarget;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'same',
      label: sameLabel,
      icon: <Sparkles className="w-3 h-3" />,
    },
    ...(primaryAction !== 'BUILD'
      ? [
          {
            key: 'build' as const,
            label: l('Build Dreadnought', '建造无畏舰'),
            icon: <Hammer className="w-3 h-3" />,
          },
        ]
      : []),
    ...(primaryAction !== 'UPGRADE'
      ? [
          {
            key: 'upgrade' as const,
            label: l('Upgrade Dreadnought', '升级无畏舰'),
            icon: <Wrench className="w-3 h-3" />,
          },
        ]
      : []),
    ...(primaryAction !== 'MOVE'
      ? [
          {
            key: 'move' as const,
            label: l('Move Dreadnought', '移动无畏舰'),
            icon: <Rocket className="w-3 h-3" />,
          },
        ]
      : []),
  ];

  return (
    <div
      data-testid="jotunn-dread-nought-banner"
      className={`px-3 py-2 rounded-xl border border-sky-500/60 bg-sky-950/45 text-xs flex items-center justify-between gap-2.5 flex-wrap ${className}`}
    >
      <div className="min-w-0">
        <div className="font-bold text-sky-200 flex items-center gap-1.5 flex-wrap">
          <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>{l('Dread Nought (+1* Special Activation)', '无畏雄心 (+1* 特殊激活)')}</span>
        </div>
        <p className="text-[10.5px] text-slate-300/90 leading-snug">
          {selectedTarget === 'same'
            ? l(
                'Currently spending +1* on an extra activation of this same action. Switch right to perform a Dreadnought action in Step 2.',
                '当前将 +1* 用于追加一次同类激活；可在右侧切换为第二步执行“无畏舰”专属操作。'
              )
            : l(
                'Primary action uses 1 normal activation (+tech bonus), then Step 2 executes your Dreadnought special activation.',
                '第一步执行 1 次常规激活（含科技加成），第二步将执行无畏舰专属激活（可一起撤回）。'
              )}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {options.map((opt) => {
          const isSelected = selectedTarget === opt.key;
          const isDisabled = opt.key !== 'same' && disableCrossSwitch && !isSelected;
          return (
            <button
              key={opt.key}
              type="button"
              data-testid={`jotunn-dn-option-${opt.key}`}
              disabled={isDisabled}
              title={isDisabled ? disableReason : opt.label}
              onClick={() => onSelectTarget(opt.key)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isSelected
                  ? 'bg-sky-400 text-slate-950 border-sky-300 shadow'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-sky-200 border-sky-700/60'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
