
import React from 'react';
import { GameState } from './types';

interface TopBarProps {
  state: GameState;
}

export const TopBar: React.FC<TopBarProps> = ({ state }) => {
  const minutes = Math.floor(state.timeLeft / 60)
  const seconds = state.timeLeft % 60
  const formattedTime = `${minutes}:${String(seconds).padStart(2, '0')}` 
  const isLowTime = state.timeLeft <= 30

  return (
    <div className="w-full bg-[#3d3d3d] border-b-8 border-black h-20 flex items-center justify-between px-8 text-[12px] md:text-[14px]">
      <div className="flex items-center space-x-2">
        <span className="text-red-500">●</span>
        <span>ALIVE: {state.aliveCount}/{state.maxPlayers}</span>
      </div>
      
      <div className={`flex items-center space-x-2 ${isLowTime ? 'animate-pulse text-red-500' : 'text-yellow-400'}`}>
        <span className="text-2xl">⏱</span>
        <span className="text-xl font-mono">{formattedTime}</span>
      </div>

      <div className="flex flex-col items-center">
        <span className="text-[10px] text-gray-400 mb-1">TOPIC</span>
        <span className="text-cyan-400 border-b-2 border-cyan-400">{state.topic?.toUpperCase()}</span>
      </div>

      <div className="flex items-center space-x-4 border-l-4 border-black pl-8 h-full">
        <span>ROUND: {state.round}/{state.totalRounds}</span>
      </div>
    </div>
  )
};
