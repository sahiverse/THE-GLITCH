
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#2a2a2a]">
      {/* Header */}
      <div className="p-3 bg-black text-left border-b-4 border-[#444]">
        <h3 className="text-[14px] font-['Press_Start_2P']">CHAT</h3>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 font-vt text-xl"
      >
        {messages.map((msg) => (
          <div key={msg.id} className="leading-tight">
            <span className="text-[10px] text-gray-500 block mb-1">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="flex flex-col">
              <span style={{ color: msg.color }} className="font-['Press_Start_2P'] text-[10px] mb-1">
                {msg.user}:
              </span>
              <span className="bg-[#1a1a1a] p-2 border border-black text-gray-200">
                {msg.text}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-[#3d3d3d] border-t-4 border-black">
        <div className="flex flex-col space-y-2">
          <input 
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type message..."
            className="w-full bg-black border-2 border-white text-white p-3 font-vt text-xl focus:outline-none focus:border-cyan-400 placeholder:opacity-50"
          />
          <button 
            type="submit"
            className="w-full bg-[#00ff00] text-black font-['Press_Start_2P'] text-[10px] py-3 border-4 border-black border-b-8 border-r-8 active:border-b-4 active:border-r-4 active:translate-y-1 active:translate-x-1 transition-all"
          >
            SEND MESSAGE
          </button>
        </div>
      </form>
    </div>
  );
};
