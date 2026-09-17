import React, { useState } from 'react';
import { GameLogEntry } from '../../engine/types/state';
import { ScrollText, ChevronDown, ChevronUp } from 'lucide-react';

interface GameLogDrawerProps {
  logs: GameLogEntry[];
}

export const GameLogDrawer: React.FC<GameLogDrawerProps> = ({ logs }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end">
      {/* Drawer Box */}
      {isOpen && (
        <div className="w-80 h-72 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl p-3 flex flex-col mb-2 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase font-display">
              <ScrollText className="w-3.5 h-3.5 text-cyan-400" /> Galaxy Event Log
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {logs.length} events
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded border text-[11px] leading-snug ${
                  log.type === 'combat'
                    ? 'bg-rose-950/30 border-rose-900/40 text-rose-200'
                    : log.type === 'economy'
                    ? 'bg-amber-950/30 border-amber-900/40 text-amber-200'
                    : log.type === 'system'
                    ? 'bg-indigo-950/30 border-indigo-900/40 text-indigo-200'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex justify-between text-[9px] text-slate-500 font-mono mb-0.5">
                  <span>RND {log.round}</span>
                  <span className="uppercase">{log.type}</span>
                </div>
                <div>{log.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold shadow-lg transition-all"
      >
        <ScrollText className="w-4 h-4 text-cyan-400" />
        <span>Log ({logs.length})</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
