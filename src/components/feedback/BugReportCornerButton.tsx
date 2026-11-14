import React from 'react';
import { Bug } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface BugReportCornerButtonProps {
  onClick: () => void;
}

export const BugReportCornerButton: React.FC<BugReportCornerButtonProps> = ({ onClick }) => {
  const { l } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-24 md:bottom-3.5 left-3.5 z-20 md:z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 hover:bg-slate-900 border border-rose-500/50 hover:border-rose-400 text-rose-300 hover:text-rose-100 text-xs font-semibold shadow-xl shadow-rose-950/60 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
      title={l('Report a bug or issue directly to bug_report.md', '反馈问题或提交 Bug 报告')}
    >
      <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/40 group-hover:bg-rose-500/30 transition-colors">
        <Bug className="w-3.5 h-3.5 text-rose-400 group-hover:rotate-12 transition-transform duration-200" />
      </div>
      <span className="font-bold tracking-wide">{l('Report Bug', '问题反馈')}</span>
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
    </button>
  );
};
