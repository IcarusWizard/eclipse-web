import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { ArrowRightLeft, ArrowRight, Coins, FlaskConical, Hammer, X } from 'lucide-react';

interface TradeModalProps {
  player: PlayerState;
  onTrade: (
    fromResource: 'money' | 'science' | 'material',
    amount: number,
    toResource: 'money' | 'science' | 'material'
  ) => void;
  onClose: () => void;
}

type ResourceType = 'money' | 'science' | 'material';

export const TradeModal: React.FC<TradeModalProps> = ({
  player,
  onTrade,
  onClose,
}) => {
  const ratio = player.faction.tradeRatio || 2;
  const [fromResource, setFromResource] = useState<ResourceType>('material');
  const [toResource, setToResource] = useState<ResourceType>('money');
  const [amount, setAmount] = useState<number>(ratio);
  const available =
    fromResource === 'money'
      ? player.resources.money
      : fromResource === 'science'
      ? player.resources.science
      : player.resources.materials;

  const maxTrade = Math.floor(available / ratio) * ratio;
  const gained = Math.floor(amount / ratio);

  const canTrade = amount > 0 && amount <= available && amount % ratio === 0 && fromResource !== toResource;

  const handleSelectFrom = (res: ResourceType) => {
    setFromResource(res);
    if (res === toResource) {
      // Pick another resource for target
      const choices: ResourceType[] = ['money', 'science', 'material'];
      const alt = choices.find((c) => c !== res) || 'money';
      setToResource(alt);
    }
    setAmount(ratio);
  };

  const handleSelectTo = (res: ResourceType) => {
    if (res === fromResource) return;
    setToResource(res);
  };

  const resourceConfig: Record<ResourceType, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
    money: {
      label: 'Credits (Money)',
      icon: <Coins className="w-4 h-4 text-yellow-400" />,
      color: 'text-yellow-400',
      bg: 'bg-yellow-950/40',
      border: 'border-yellow-500',
    },
    science: {
      label: 'Science',
      icon: <FlaskConical className="w-4 h-4 text-pink-400" />,
      color: 'text-pink-400',
      bg: 'bg-pink-950/40',
      border: 'border-pink-500',
    },
    material: {
      label: 'Materials',
      icon: <Hammer className="w-4 h-4 text-amber-500" />,
      color: 'text-amber-400',
      bg: 'bg-amber-950/40',
      border: 'border-amber-500',
    },
  };

  const getBalance = (res: ResourceType) => {
    if (res === 'money') return player.resources.money;
    if (res === 'science') return player.resources.science;
    return player.resources.materials;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <ArrowRightLeft className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100 font-display">
              COMMERCE & RESOURCE EXCHANGE
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-400 leading-relaxed">
            Faction Exchange Rate: <strong className="text-amber-400 font-bold">{ratio}:1</strong>.
            Trade {ratio} units of any resource for 1 unit of another resource at your galactic commerce ratio.
          </div>

          {/* Trade Source */}
          <div>
            <label className="block text-slate-300 font-bold uppercase mb-2 text-[11px] tracking-wider">
              1. Trade Source (Pay {ratio} units)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['material', 'science', 'money'] as const).map((res) => {
                const cfg = resourceConfig[res];
                const isSelected = fromResource === res;
                return (
                  <button
                    key={`from_${res}`}
                    type="button"
                    onClick={() => handleSelectFrom(res)}
                    className={`p-2.5 rounded-lg border flex flex-col justify-between text-left transition-all ${
                      isSelected
                        ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-1 ring-amber-400/30 font-bold`
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {cfg.icon}
                      <span className="truncate">{cfg.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-300">
                      {getBalance(res)} Avail
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trade Destination */}
          <div>
            <label className="block text-slate-300 font-bold uppercase mb-2 text-[11px] tracking-wider">
              2. Trade Target (Receive 1 unit)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['money', 'science', 'material'] as const).map((res) => {
                const cfg = resourceConfig[res];
                const isSelected = toResource === res;
                const isDisabled = fromResource === res;
                return (
                  <button
                    key={`to_${res}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectTo(res)}
                    className={`p-2.5 rounded-lg border flex flex-col justify-between text-left transition-all ${
                      isDisabled
                        ? 'opacity-30 border-slate-900 bg-slate-950/40 cursor-not-allowed'
                        : isSelected
                        ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-1 ring-emerald-400/30 font-bold`
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {cfg.icon}
                      <span className="truncate">{cfg.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-300">
                      {getBalance(res)} Current
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount input & Exchange summary */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <label className="block text-slate-300 font-bold uppercase mb-2 text-[11px] tracking-wider">
              Amount to Spend (Multiples of {ratio})
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={ratio}
                max={maxTrade}
                step={ratio}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 w-32 font-bold text-slate-100 font-mono focus:border-amber-500 focus:outline-none text-sm"
              />
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Yields{' '}
                  <strong className="text-emerald-400 font-bold text-base font-mono">
                    +{gained} {resourceConfig[toResource].label}
                  </strong>
                </span>
              </div>
            </div>
            {amount > available && (
              <div className="mt-2 text-rose-400 font-medium text-[11px]">
                Insufficient {fromResource} ({available} available).
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            disabled={!canTrade}
            onClick={() => onTrade(fromResource, amount, toResource)}
            className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs tracking-wide shadow transition-all cursor-pointer"
          >
            Confirm Exchange
          </button>
        </div>
      </div>
    </div>
  );
};
