import React, { useState, useEffect, useRef } from 'react';
import { Bug, X, Send, CheckCircle2, AlertCircle, Loader2, Sparkles, Gamepad2, Layers } from 'lucide-react';
import { GameState } from '../../engine/types/state';
import { UserSession } from '../../engine/types/user';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateGamePhase } from '../../i18n/catalogTranslations';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state?: GameState | null;
  tableNumber?: number | string;
  context?: string;
  currentUser?: UserSession | null;
  onSuccess?: (message: string) => void;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({
  isOpen,
  onClose,
  state,
  tableNumber,
  context,
  currentUser,
  onSuccess,
}) => {
  const { l, language } = useLanguage();
  const [description, setDescription] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitted(false);
      setErrorMessage(null);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activePlayer = state ? state.players[state.activePlayerIndex] : null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = description.trim();
    if (!trimmed) {
      setErrorMessage(l('Please describe what happened or what looks wrong.', '请描述发生了什么问题或异常现象。'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: Record<string, any> = {
        description: trimmed,
      };

      if (includeContext) {
        if (state) {
          payload.round = state.round;
          payload.phase = state.phase;
          if (activePlayer) {
            payload.playerName = activePlayer.name;
          }
          if (tableNumber) {
            payload.tableNumber = tableNumber;
          }
        }
        if (context) {
          payload.context = context;
        }
        if (currentUser?.username) {
          payload.username = currentUser.username;
          if (!payload.playerName) {
            payload.playerName = currentUser.username;
          }
        }
      }


      const res = await fetch('/api/report-bug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || l('Failed to submit bug report', '提交问题报告失败'));
      }

      setIsSubmitted(true);
      setDescription('');
      if (onSuccess) {
        onSuccess(l('Bug report logged to bug_report.md!', '问题报告已记录到 bug_report.md！'));
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || l('Failed to connect to bug reporting service.', '连接问题反馈服务失败。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl shadow-rose-950/50 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ambient Glow */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-lg shadow-rose-600/30">
              <Bug className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {l('Report Issue / Bug', '反馈问题 / Bug')}
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {l('Instant Log', '即时记录')}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {l('Logged directly into ', '将直接记录到 ')}
                <code className="text-rose-300 font-mono">bug_report.md</code>
                {l(' for rapid iterations.', ' 以便快速修复。')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={l('Close (Esc)', '关闭 (Esc)')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Active Context Preview */}
          {(state || context) && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />{' '}
                  {state ? l('Current Game State', '当前对局状态') : l('Lobby Context', '大厅上下文')}
                </span>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeContext}
                    onChange={(e) => setIncludeContext(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-rose-500 focus:ring-rose-500/30"
                  />
                  <span>{l('Attach context info', '附带上下文信息')}</span>
                </label>
              </div>

              {includeContext && (
                <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                  {context && !state && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {l('Location:', '位置：')} <strong className="text-cyan-300">{context}</strong>
                    </span>
                  )}
                  {state && (
                    <>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {l('Round:', '轮次：')} <strong className="text-cyan-300">{state.round}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {l('Phase:', '阶段：')} <strong className="text-amber-300">{translateGamePhase(state.phase, language)}</strong>
                      </span>
                      {activePlayer && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {l('Active:', '当前行动：')} <strong className="text-emerald-300">{activePlayer.name}</strong>
                        </span>
                      )}
                      {tableNumber && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {l('Table:', '桌号：')} <strong className="text-purple-300">#{tableNumber}</strong>
                        </span>
                      )}
                    </>
                  )}
                  {currentUser?.username && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {l('Commander:', '指挥官：')} <strong className="text-emerald-300">{currentUser.username}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}


          {/* Free text field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bug-description" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{l('Bug Description & Observations:', '问题描述与现象观察：')}</span>
              <span className="text-[11px] text-slate-500 font-mono">{l('Press Ctrl+Enter to submit', '按 Ctrl+Enter 提交')}</span>
            </label>
            <textarea
              id="bug-description"
              ref={textareaRef}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting || isSubmitted}
              placeholder={l(
                "Describe what happened, unexpected behavior, or what was stuck (e.g. Discovery modal didn't close, combat dice miscalculated...)",
                '描述具体发生了什么、异常行为或卡住的位置（例如：探索弹窗无法关闭、战斗伤害计算有误等...）'
              )}
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-rose-500/80 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none transition-all disabled:opacity-50"
            />
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {isSubmitted && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                {l('Report added to ', '已记录至 ')}
                <code className="font-mono text-emerald-200">bug_report.md</code>
                {l('! Thank you.', '！感谢反馈。')}
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {l('Cancel', '取消')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSubmitted || !description.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{l('Submitting...', '提交中...')}</span>
                </>
              ) : isSubmitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{l('Logged!', '已记录！')}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{l('Submit Bug', '提交反馈')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
