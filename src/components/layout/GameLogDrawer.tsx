import React, { useState, useMemo } from 'react';
import { GameLogEntry } from '../../engine/types/state';
import { ScrollText, ChevronDown, ChevronUp, Maximize2, Minimize2, Swords, Coins, Sparkles, Activity } from 'lucide-react';

interface GameLogDrawerProps {
  logs: GameLogEntry[];
}

type FilterType = 'all' | 'action' | 'combat' | 'economy' | 'system';

export const GameLogDrawer: React.FC<GameLogDrawerProps> = ({ logs }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredLogs = useMemo(() => {
    if (activeFilter === 'all') return logs;
    return logs.filter((l) => l.type === activeFilter);
  }, [logs, activeFilter]);

  const counts = useMemo(() => {
    const c = { all: logs.length, action: 0, combat: 0, economy: 0, system: 0 };
    for (const l of logs) {
      if (l.type in c) {
        c[l.type as keyof typeof c]++;
      }
    }
    return c;
  }, [logs]);

  return (
    <div className="fixed bottom-24 md:bottom-4 right-3.5 md:right-4 z-20 md:z-30 flex flex-col items-end">
      {/* Drawer Box */}
      {isOpen && (
        <div
          className={`${
            isExpanded ? 'w-[calc(100vw-28px)] sm:w-[28rem] h-[34rem]' : 'w-[calc(100vw-28px)] sm:w-96 h-80'
          } bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl p-3 flex flex-col mb-2 backdrop-blur-md transition-all`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase font-display">
              <ScrollText className="w-4 h-4 text-cyan-400" /> Galaxy Chronicle & Event Log
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                title={isExpanded ? 'Compress Drawer' : 'Expand Drawer'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                title="Close Drawer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 mb-2 pb-1 overflow-x-auto text-[10px] font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2 py-1 rounded transition whitespace-nowrap cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('action')}
              className={`px-2 py-1 rounded transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                activeFilter === 'action'
                  ? 'bg-blue-950/80 text-blue-300 border border-blue-700/60 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Activity className="w-3 h-3" /> Actions ({counts.action})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('combat')}
              className={`px-2 py-1 rounded transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                activeFilter === 'combat'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Swords className="w-3 h-3" /> Combat ({counts.combat})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('economy')}
              className={`px-2 py-1 rounded transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                activeFilter === 'economy'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Coins className="w-3 h-3" /> Economy ({counts.economy})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('system')}
              className={`px-2 py-1 rounded transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                activeFilter === 'system'
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Sparkles className="w-3 h-3" /> System ({counts.system})
            </button>
          </div>

          {/* Logs List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[11px] text-slate-500 italic">
                No events recorded for this category yet.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-lg border text-[11px] leading-relaxed transition-all ${
                    log.type === 'combat'
                      ? 'bg-rose-950/20 border-rose-900/50 text-rose-100'
                      : log.type === 'economy'
                      ? 'bg-amber-950/20 border-amber-900/50 text-amber-100'
                      : log.type === 'system'
                      ? 'bg-indigo-950/20 border-indigo-900/50 text-indigo-100'
                      : 'bg-slate-900/80 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mb-1">
                    <span className="bg-slate-800/80 px-1.5 py-0.5 rounded font-bold text-slate-300">
                      RND {log.round}
                    </span>
                    <span
                      className={`uppercase font-bold tracking-wider ${
                        log.type === 'combat'
                          ? 'text-rose-400'
                          : log.type === 'economy'
                          ? 'text-amber-400'
                          : log.type === 'system'
                          ? 'text-indigo-400'
                          : 'text-cyan-400'
                      }`}
                    >
                      {log.type}
                    </span>
                  </div>
                  <div className="break-words">{log.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold shadow-lg transition-all cursor-pointer"
      >
        <ScrollText className="w-4 h-4 text-cyan-400" />
        <span>Chronicle ({logs.length})</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
