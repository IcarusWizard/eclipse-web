import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChatMessage } from '../../engine/types/state';
import { PlayerState } from '../../engine/types/player';
import {
  isBlackFaction,
  getFactionDisplayColor,
  getPlayerHumanName,
  getFactionShortName,
} from '../../engine/rules/gameReducer';
import { MessageSquare, Send, ChevronDown, ChevronUp, Maximize2, Minimize2, X } from 'lucide-react';

interface GameChatDrawerProps {
  messages?: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentSenderLabel: string;
  currentSenderFactionName?: string;
  currentSenderFactionColor?: string;
  currentSenderId?: string;
  tableNumber?: number;
  players?: PlayerState[];
  members?: any[];
  initialOpen?: boolean;
}

export const GameChatDrawer: React.FC<GameChatDrawerProps> = ({
  messages = [],
  onSendMessage,
  currentSenderLabel,
  currentSenderFactionName,
  currentSenderFactionColor,
  currentSenderId,
  tableNumber,
  players,
  members,
  initialOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(initialOpen);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [lastReadCount, setLastReadCount] = useState<number>(() =>
    initialOpen ? messages.length : 0
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const unreadCount = useMemo(() => {
    if (isOpen) return 0;
    const diff = Math.max(0, messages.length - lastReadCount);
    if (diff <= 0) return 0;
    if (!currentSenderId) return diff;
    return messages.slice(messages.length - diff).filter((m) => m.senderPlayerId !== currentSenderId).length;
  }, [messages, lastReadCount, isOpen, currentSenderId]);

  const handleToggle = () => {
    if (!isOpen) {
      setLastReadCount(messages.length);
      setIsOpen(true);
      setTimeout(() => {
        inputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else {
      setLastReadCount(messages.length);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLastReadCount(messages.length);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
    setTimeout(() => {
      inputRef.current?.focus();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 20);
  };

  const formatTime = (ts: number) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed bottom-24 md:bottom-4 right-[8.8rem] sm:right-[9.8rem] md:right-[10.5rem] z-20 md:z-30 flex flex-col items-end">
      {/* Chat Drawer Box */}
      {isOpen && (
        <div
          data-testid="chat-drawer-box"
          className={`${
            isExpanded
              ? 'w-[calc(100vw-28px)] sm:w-[28rem] h-[34rem]'
              : 'w-[calc(100vw-28px)] sm:w-80 md:w-96 h-80 sm:h-96'
          } bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl p-3 flex flex-col mb-2 backdrop-blur-md transition-all`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase font-display">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Table Chat</span>
              {tableNumber && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-semibold">
                  #{tableNumber}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title={isExpanded ? 'Compress Chat' : 'Expand Chat'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLastReadCount(messages.length);
                  setIsOpen(false);
                }}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Close Chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 p-2 rounded-lg bg-slate-900/40 border border-slate-900/80 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs italic">
                <MessageSquare className="w-6 h-6 mb-2 opacity-30 text-cyan-400" />
                <p>No messages in table chat yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Type a message below and hit Enter to chat!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isBlack = isBlackFaction(msg.senderFactionName, msg.senderFactionColor);
                const displayColor = getFactionDisplayColor(msg.senderFactionColor, msg.senderFactionName);

                // Defensive check against messages where senderName was saved as faction name
                const displaySenderName = (() => {
                  const sName = msg.senderName?.trim();
                  const fName = msg.senderFactionName?.trim();
                  const shortF = fName ? getFactionShortName(fName).trim() : '';
                  const isDuplicateFaction = Boolean(
                    fName && sName && (
                      sName.toLowerCase() === fName.toLowerCase() ||
                      (shortF && sName.toLowerCase() === shortF.toLowerCase()) ||
                      sName.toLowerCase() === 'commander'
                    )
                  );
                  if (isDuplicateFaction) {
                    if (players && msg.senderPlayerId) {
                      const pIdx = players.findIndex((p) => p.id === msg.senderPlayerId);
                      if (pIdx >= 0) {
                        return getPlayerHumanName(players[pIdx], pIdx, members, null);
                      }
                    }
                    return 'Player';
                  }
                  return sName || 'Commander';
                })();

                return (
                  <div
                    key={msg.id}
                    data-testid="chat-message-row"
                    className="text-xs leading-relaxed break-words hover:bg-slate-800/40 p-1 rounded-md transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-1.5">
                      <div className="break-words flex-1">
                        {/* BGG Format: Faction (player name): <message> */}
                        {isBlack ? (
                          <span
                            data-testid="chat-black-faction-badge"
                            className="font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-500 text-zinc-100 shadow-sm inline-block mr-1 text-[11px]"
                          >
                            {msg.senderFactionName || 'Commander'}
                          </span>
                        ) : (
                          <span
                            className="font-bold"
                            style={{ color: displayColor }}
                          >
                            {msg.senderFactionName || 'Commander'}
                          </span>
                        )}{' '}
                        <span className="font-semibold text-slate-300">
                          {`(${displaySenderName}):`}
                        </span>{' '}
                        <span className="text-slate-100 font-normal selection:bg-cyan-500/30">
                          {msg.text}
                        </span>
                      </div>
                      {msg.timestamp && (
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 select-none ml-1">
                          {formatTime(msg.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Text Input Area */}
          <form
            onSubmit={handleSubmit}
            className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-1.5"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message and hit Enter..."
              maxLength={500}
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-bold transition-all cursor-pointer shrink-0 shadow-md"
              title="Send message (Enter)"
            >
              <Send className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </form>

          {/* Chatting As Hint */}
          <div className="text-[10px] text-slate-500 mt-1 px-1 flex items-center justify-between font-mono">
            <span className="truncate mr-2">
              Chatting as:{' '}
              {isBlackFaction(currentSenderFactionName, currentSenderFactionColor) ? (
                <strong
                  data-testid="chat-black-sender-hint"
                  className="font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-500 text-zinc-100 shadow-sm inline-block"
                >
                  {currentSenderLabel}
                </strong>
              ) : (
                <strong
                  className="font-bold"
                  style={{
                    color: getFactionDisplayColor(currentSenderFactionColor, currentSenderFactionName),
                  }}
                >
                  {currentSenderLabel}
                </strong>
              )}
            </span>
            <span className="shrink-0 text-slate-600">Enter to send</span>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        type="button"
        data-testid="chat-toggle-button"
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold shadow-lg transition-all cursor-pointer relative"
        title="Table Chat"
      >
        <MessageSquare className="w-4 h-4 text-cyan-400" />
        <span>{`Chat (${messages.length})`}</span>
        {unreadCount > 0 && !isOpen && (
          <span
            data-testid="chat-unread-badge"
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black tracking-wide shadow-md shadow-cyan-500/50 animate-pulse"
            title={`${unreadCount} new messages`}
          >
            <span>!</span>
            <span>{unreadCount}</span>
          </span>
        )}
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
