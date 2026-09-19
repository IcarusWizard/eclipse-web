import React from 'react';
import { Bug } from 'lucide-react';

interface BugReportCornerButtonProps {
  onClick: () => void;
}

export const BugReportCornerButton: React.FC<BugReportCornerButtonProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-3.5 left-3.5 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 hover:bg-slate-900 border border-rose-500/50 hover:border-rose-400 text-rose-300 hover:text-rose-100 text-xs font-semibold shadow-xl shadow-rose-950/60 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
      title="Report a bug or issue directly to bug_report.md"
    >
      <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/40 group-hover:bg-rose-500/30 transition-colors">
        <Bug className="w-3.5 h-3.5 text-rose-400 group-hover:rotate-12 transition-transform duration-200" />
      </div>
      <span className="font-bold tracking-wide">Report Bug</span>
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
    </button>
  );
};
