import React, { useState, useEffect, useMemo } from 'react';
import { GameState } from '../../engine/types/state';
import { UserSession, RegisteredUserProfile, TableMember } from '../../engine/types/user';
import { adminListUsers } from '../../engine/rules/userSession';
import { getPlayerDisplayName, isBlackFaction, getFactionDisplayColor } from '../../engine/rules/gameReducer';
import {
  Shield,
  X,
  UserCheck,
  UserX,
  Users,
  Search,
  Check,
  AlertCircle,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Mail,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateFactionName, translateGamePhase } from '../../i18n/catalogTranslations';

interface AdminManageSeatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  currentUser: UserSession;
  currentSeat: number | 'all' | 'spectator' | undefined;
  onTakeSeat: (seatIndex: number) => void;
  onReassignSeat: (seatIndex: number, targetUser: RegisteredUserProfile) => Promise<{ success: boolean; error?: string }>;
  onSendReminder?: (seatIndex: number) => Promise<{
    success: boolean;
    mock?: boolean;
    email?: string;
    username?: string;
    error?: string;
  }>;
}

export const AdminManageSeatsModal: React.FC<AdminManageSeatsModalProps> = ({
  isOpen,
  onClose,
  state,
  currentUser,
  currentSeat,
  onTakeSeat,
  onReassignSeat,
  onSendReminder,
}) => {
  const { l, language } = useLanguage();
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [expandedSeatIndex, setExpandedSeatIndex] = useState<number | null>(null);
  const [selectedUserBySeat, setSelectedUserBySeat] = useState<Record<number, string>>({});
  const [searchQueryBySeat, setSearchQueryBySeat] = useState<Record<number, string>>({});
  const [isSubmittingSeat, setIsSubmittingSeat] = useState<number | null>(null);
  const [isSendingReminderSeat, setIsSendingReminderSeat] = useState<number | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Fetch registered users on modal open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingUsers(true);
    adminListUsers().then((res) => {
      if (isMounted) {
        setIsLoadingUsers(false);
        if (res.success && res.users) {
          setRegisteredUsers(res.users);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const tableNumber = (state as any).tableNumber || state.id;
  const members = (state.members || []) as TableMember[];

  const handleConfirmReassign = async (seatIdx: number) => {
    const targetUserId = selectedUserBySeat[seatIdx];
    if (!targetUserId) {
      setErrorToast(l('Please select a registered user to assign to this seat.', '请选择一位已注册用户分配到此席位。'));
      return;
    }
    const targetUser = registeredUsers.find((u) => u.id === targetUserId);
    if (!targetUser) {
      setErrorToast(l('Selected user not found.', '未找到所选用户。'));
      return;
    }

    setIsSubmittingSeat(seatIdx);
    setErrorToast(null);
    setSuccessToast(null);

    const res = await onReassignSeat(seatIdx, targetUser);
    setIsSubmittingSeat(null);

    if (res.success) {
      setSuccessToast(
        l(
          `Seat ${seatIdx + 1} successfully reassigned to ${targetUser.username}!`,
          `${seatIdx + 1} 号位已成功重新分配给 ${targetUser.username}！`
        )
      );
      setExpandedSeatIndex(null);
      setTimeout(() => setSuccessToast(null), 4000);
    } else {
      setErrorToast(res.error || l('Failed to reassign seat.', '重新分配席位失败。'));
    }
  };

  const handleManualSendReminder = async (seatIdx: number) => {
    if (!onSendReminder) return;
    setIsSendingReminderSeat(seatIdx);
    setErrorToast(null);
    setSuccessToast(null);

    const res = await onSendReminder(seatIdx);
    setIsSendingReminderSeat(null);

    if (res.success) {
      const recipientLabel = res.username || l(`Seat ${seatIdx + 1}`, `${seatIdx + 1} 号位`);
      const emailSuffix = res.email ? ` (${res.email})` : '';
      setSuccessToast(
        res.mock
          ? l(
              `Reminder logged in mock mode (no SMTP) for ${recipientLabel}${emailSuffix}.`,
              `已为 ${recipientLabel}${emailSuffix} 记录提醒日志（未配置 SMTP，模拟模式）。`
            )
          : l(
              `Turn reminder email sent to ${recipientLabel}${emailSuffix}!`,
              `已向 ${recipientLabel}${emailSuffix} 发送回合提醒邮件！`
            )
      );
      setTimeout(() => setSuccessToast(null), 5000);
    } else {
      setErrorToast(res.error || l('Failed to send reminder email.', '发送提醒邮件失败。'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-slate-950 border border-rose-500/40 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 relative flex flex-col gap-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-600/70 text-rose-300">
              <Shield className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-display font-black tracking-wide text-white uppercase">
                  {l('Manage Table Seats', '管理牌桌席位')}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700 font-mono font-bold">
                  {l('Admin Only', '仅管理员')}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {l(`Table #${tableNumber}`, `桌号 #${tableNumber}`)} &bull; {l(`Round ${state.round}`, `第 ${state.round} 轮`)} &bull;{' '}
                {translateGamePhase(state.phase, language)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title={l('Close', '关闭')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Guidance Alert */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span>
              <strong>{l('Active Match Integrity:', '对局席位完整性：')}</strong>{' '}
              {l('In-progress games cannot have empty or vacated seats. To remove an inactive player, either ', '进行中的对局不能出现空席。如需替换离线玩家，可')}
              <strong>{l('take the seat directly', '直接接管该席位')}</strong>
              {l(' to assume command, or ', '继续游戏，或')}
              <strong>{l('reassign the seat', '将其重新分配')}</strong>
              {l(' to another registered user.', '给其他已注册用户。')}
            </span>
          </div>
        </div>

        {/* Toast feedback */}
        {successToast && (
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/70 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}
        {errorToast && (
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/70 text-rose-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorToast}</span>
          </div>
        )}

        {/* Seat Cards List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {state.players.map((p, sIdx) => {
            const occupant = members.find((m) => m && m.seat === sIdx);
            const isMe = occupant?.userId === currentUser.id;
            const isExpanded = expandedSeatIndex === sIdx;
            const factionName = p.faction
              ? translateFactionName(p.faction.id, p.faction.name, language)
              : l(`Faction ${sIdx + 1}`, `种族 ${sIdx + 1}`);
            const isBlack = isBlackFaction(p.faction?.name, p.color);
            const displayColor = getFactionDisplayColor(p.color, p.faction?.name);
            const currentSelectedUser = selectedUserBySeat[sIdx] || '';
            const query = (searchQueryBySeat[sIdx] || '').toLowerCase().trim();

            const eligibleUsers = registeredUsers.filter((u) => {
              if (occupant && u.id === occupant.userId) return false;
              if (!query) return true;
              return (
                u.username.toLowerCase().includes(query) ||
                (u.name && u.name.toLowerCase().includes(query))
              );
            });

            return (
              <div
                key={p.id}
                data-testid={`admin-seat-card-${sIdx + 1}`}
                className={`rounded-xl border transition-all p-3.5 flex flex-col gap-3 ${
                  isMe
                    ? 'bg-rose-950/20 border-rose-500/60 ring-1 ring-rose-500/30'
                    : occupant
                    ? 'bg-slate-900/60 border-slate-800'
                    : 'bg-slate-900/30 border-dashed border-slate-700'
                }`}
              >
                {/* Seat Summary Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {l(`SEAT ${sIdx + 1}`, `${sIdx + 1} 号位`)}
                    </span>
                    <div className="flex items-center gap-1.5 truncate">
                      {isBlack ? (
                        <span className="font-bold px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-500 text-zinc-100 text-[11px] shrink-0">
                          {factionName}
                        </span>
                      ) : (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-600/80 shadow-sm"
                          style={{ backgroundColor: displayColor }}
                        />
                      )}
                      {!isBlack && (
                        <span className="font-bold text-xs text-slate-200 truncate">
                          {factionName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Occupant Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    {occupant ? (
                      <div className="flex items-center gap-1.5 text-xs bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
                        <span className="text-slate-400">{l('Commander:', '控制者：')}</span>
                        <strong className="text-white font-bold">{occupant.username}</strong>
                        {isMe ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-950 text-rose-300 border border-rose-700">
                            {l('YOU (ADMIN)', '你（管理员）')}
                          </span>
                        ) : occupant.role === 'admin' ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-950 text-rose-300 border border-rose-700">
                            {l('ADMIN', '管理员')}
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                            {l('PLAYER', '玩家')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-amber-400 italic bg-amber-950/40 px-2 py-1 rounded border border-amber-800/60">
                        {l('Awaiting Controller', '等待接管')}
                      </span>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {onSendReminder && occupant && (
                        <button
                          type="button"
                          data-testid={`admin-send-reminder-${sIdx + 1}`}
                          disabled={isSendingReminderSeat === sIdx}
                          onClick={() => handleManualSendReminder(sIdx)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow cursor-pointer"
                          title={l(
                            'Manually send a turn reminder email to this player',
                            '手动向该玩家发送回合提醒邮件'
                          )}
                        >
                          {isSendingReminderSeat === sIdx ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                          <span>{l('Send Email', '发邮件提醒')}</span>
                        </button>
                      )}

                      {!isMe && (
                        <button
                          type="button"
                          onClick={() => onTakeSeat(sIdx)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow cursor-pointer"
                          title={l('Take command of this seat directly', '直接接管此席位')}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{l('Take Seat', '接管席位')}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedSeatIndex(isExpanded ? null : sIdx)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                          isExpanded
                            ? 'bg-slate-800 text-cyan-300 border-cyan-500/60'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                        title={l('Reassign this seat to another registered user', '将该席位重新分配给其他注册玩家')}
                      >
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{l('Reassign', '重新分配')}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Reassignment Panel */}
                {isExpanded && (
                  <div className="mt-2 pt-3 border-t border-slate-800/80 bg-slate-950/60 rounded-xl p-3 flex flex-col gap-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span>{l(`Select registered user to assign to Seat ${sIdx + 1}:`, `选择要分配到 ${sIdx + 1} 号位的已注册玩家：`)}</span>
                      {isLoadingUsers && (
                        <span className="flex items-center gap-1 text-[11px] text-cyan-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{l('Loading users...', '加载用户列表中...')}</span>
                        </span>
                      )}
                    </div>

                    {/* User Search & Select Filter */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQueryBySeat[sIdx] || ''}
                          onChange={(e) =>
                            setSearchQueryBySeat((prev) => ({ ...prev, [sIdx]: e.target.value }))
                          }
                          placeholder={l('Filter users by name...', '按用户名筛选...')}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                        />
                      </div>

                      <select
                        value={currentSelectedUser}
                        onChange={(e) =>
                          setSelectedUserBySeat((prev) => ({ ...prev, [sIdx]: e.target.value }))
                        }
                        className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-500 transition"
                      >
                        <option value="">
                          {l(`-- Choose Commander (${eligibleUsers.length} available) --`, `-- 选择玩家 (${eligibleUsers.length} 人可选) --`)}
                        </option>
                        {eligibleUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.username} {u.name && u.name !== u.username ? `(${u.name})` : ''} [{u.role.toUpperCase()}]
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Confirm Reassign Action Bar */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedSeatIndex(null)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition"
                      >
                        {l('Cancel', '取消')}
                      </button>
                      <button
                        type="button"
                        disabled={!currentSelectedUser || isSubmittingSeat === sIdx}
                        onClick={() => handleConfirmReassign(sIdx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow cursor-pointer"
                      >
                        {isSubmittingSeat === sIdx ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>{l('Confirm Reassign', '确认分配')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 italic">
            {l('Changes take effect immediately and sync across all connected commanders.', '修改将立即生效，并同步至所有在线玩家。')}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            {l('Done', '完成')}
          </button>
        </div>
      </div>
    </div>
  );
};
