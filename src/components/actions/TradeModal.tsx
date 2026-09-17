import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { ArrowRightLeft, Coins, FlaskConical, Hammer, X } from 'lucide-react';

interface TradeModalProps {
  player: PlayerState;
  onTrade: (fromResource: 'science' | 'material', amount: number) => void;
  onClose: () => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  player,
  onTrade,
  onClose,
}) => {
  const [resource, setResource] = useState<'science' | 'material'>('material');
  const [amount, setAmount] = useState<number>(2);

  const ratio = player.faction.tradeRatio || 2;
  const available = resource === 'science' ? player.resources.science : player.resources.materials;
  const maxTrade = Math.floor(available / ratio) * ratio;
  const creditsGained = Math.floor(amount / ratio);

  const canTrade = amount > 0 && amount <= available && amount % ratio === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <ArrowRightLeft className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100 font-display">
              COMMERCE & CREDIT EXCHANGE
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-400">
            Human Exchange Rate: <strong className="text-amber-400 font-bold">{ratio}:1</strong>.
            Trade {ratio} Materials or {ratio} Science for 1 Credit to pay upkeep or avoid bankruptcy.
          </div>

          <div>
            <label className="block text-slate-300 font-bold uppercase mb-2">Trade Source</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setResource('material');
                  setAmount(2);
                }}
                className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${
                  resource === 'material'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold">
                  <Hammer className="w-4 h-4" /> Materials
                </span>
                <span className="font-bold">{player.resources.materials} Avail</span>
              </button>

              <button
                onClick={() => {
                  setResource('science');
                  setAmount(2);
                }}
                className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${
                  resource === 'science'
                    ? 'bg-pink-950/40 border-pink-500 text-pink-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold">
                  <FlaskConical className="w-4 h-4" /> Science
                </span>
                <span className="font-bold">{player.resources.science} Avail</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold uppercase mb-2">
              Amount to Trade (Multiples of {ratio})
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={ratio}
                max={maxTrade}
                step={ratio}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 w-32 font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
              />
              <span className="text-slate-400">
                ➔ Yields <strong className="text-amber-400 font-bold text-sm">+{creditsGained} Credits</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            disabled={!canTrade}
            onClick={() => onTrade(resource, amount)}
            className="px-5 py-2 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs tracking-wide shadow"
          >
            Confirm Exchange
          </button>
        </div>
      </div>
    </div>
  );
};
