/**
 * ChatPanel Component
 * 
 * Real-time chat interface for game communication.
 * Integrates with useChat hook for message management.
 * 
 * Features:
 * - Auto-scroll to newest message
 * - Message input with character limit
 * - Visual distinction between own and other players' messages
 * - Vote-out indicator (read-only mode for eliminated players)
 */

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../src/hooks/useChat';

interface MessageObject {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  message: string;
  timestamp: number;
  type: "player" | "system";
}

interface ChatPanelProps {
  socket: any;
  roomCode: string;
  socketId: string;
  isVotedOut: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ socket, roomCode, socketId, isVotedOut }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, error, sendMessage } = useChat({ socket, roomCode, socketId, isVotedOut });

  /**
   * Maintain scroll position at newest message.
   * Using scrollIntoView with smooth behavior for better UX;
   * ref is on a sentinel div at messages list bottom.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue(''); // Optimistic clear
    }
  };

  /**
   * Handle Enter key to submit (Shift+Enter for newline).
   * Prevents default form submission on bare Enter.
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /** Determine if message was sent by current player for styling. */
  const isOwnMessage = (message: MessageObject) => message.playerId === socketId;

  return (
    <div className="flex flex-col h-full max-h-full bg-gray-900 border border-gray-700">
      {/* Header */}
      <div className="p-3 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-white font-bold text-center">CHAT</h3>
      </div>
      
      {/* Voted out indicator */}
      {isVotedOut && (
        <div className="p-2 bg-red-900 text-red-200 text-sm text-center border-b border-red-700 flex-shrink-0">
          You have been voted out. You can read but not send messages.
        </div>
      )}

      {/* Messages container - takes available space */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-[750px]">
          {messages.filter(msg => msg && typeof msg === 'object' && msg.id).map((msg) => (
            <div
              key={msg.id}
              className={`flex ${isOwnMessage(msg) ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${isOwnMessage(msg) ? 'text-right' : 'text-left'}`}>
                {!isOwnMessage(msg) && (
                  <div className="text-xs mb-1" style={{ color: msg.playerColor }}>
                    {msg.playerName}
                  </div>
                )}
                <div className={`inline-block p-2 rounded-lg text-sm ${isOwnMessage(msg)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                  }`}>
                  {msg.message}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-2 bg-red-100 text-red-600 text-sm text-center border-b border-red-300 flex-shrink-0">
          {error}
        </div>
      )}

      {/* Input - fixed at bottom */}
      <div className="border-t border-gray-700 p-3 bg-gray-800 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isVotedOut ? "You have been voted out" : "Type a message..."}
            disabled={isVotedOut}
            maxLength={200}
            className={`flex-1 px-3 py-2 rounded border text-sm ${isVotedOut
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-white text-black border-gray-300 focus:outline-none focus:border-blue-500'
              }`}
          />
          <button
            type="submit"
            disabled={isVotedOut || !inputValue.trim()}
            className={`px-4 py-2 rounded text-sm font-medium ${isVotedOut || !inputValue.trim()
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }`}
          >
            SEND
          </button>
        </form>
      </div>
    </div>
  );
};
