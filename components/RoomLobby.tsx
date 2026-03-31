import React, { useState, useEffect } from 'react';
import RetroButton from './RetroButton';

interface Player {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  isReady: boolean;
}

interface RoomLobbyProps {
  inviteCode: string;
  roomName: string;
  playerName: string;
  isHost: boolean;
  maxPlayers: number;
  roomData: any;
  yourPlayer: any;
  socket: any;
  onStart: () => void;
  onBack: () => void;
}

const RoomLobby: React.FC<RoomLobbyProps> = ({ inviteCode, roomName, playerName, isHost, maxPlayers, roomData, yourPlayer, socket, onStart, onBack }) => {
  const [localReady, setLocalReady] = useState(false);

  // Get ready state from yourPlayer data
  const isReady = yourPlayer?.isReady || false;

  useEffect(() => {
    if (yourPlayer) {
      setLocalReady(yourPlayer.isReady);
    }
  }, [yourPlayer]);

  const toggleReady = () => {
    const newReadyState = !localReady;
    setLocalReady(newReadyState);
    
    // Emit ready state to server
    socket?.emit('player_ready', {
      code: inviteCode,
      isReady: newReadyState
    });
  };

  const handleLeaveRoom = () => {
    console.log('🚪 handleLeaveRoom called, emitting leave_room with code:', inviteCode);
    socket?.emit('leave_room', {
      code: inviteCode
    });
    onBack();
  };

  const displayedTitle = roomName || 'BATTLE ARENA';
  const players = roomData?.players || [];

  return (
    <div className="flex flex-col items-center w-full max-w-md animate-in fade-in zoom-in duration-500">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-5xl text-[#f19121] drop-shadow-[4px_4px_0px_#000] uppercase mb-2 font-pixel tracking-tight">
          {displayedTitle}
        </h1>
      </div>

      <div className="bg-[#f8f0d8] border-4 border-retro-black p-4 mb-8 shadow-[6px_6px_0_0_#000] flex flex-col items-center min-w-[280px] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-white opacity-20"></div>
        
        {isHost ? (
          <>
            <span className="font-vcr text-sm text-retro-brick mb-2 uppercase">Share this code:</span>
            <div className="flex items-center gap-4">
              <span className="font-pixel text-3xl text-[#f19121] tracking-widest drop-shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
                {inviteCode}
              </span>
              <button 
                onClick={() => navigator.clipboard.writeText(inviteCode)}
                className="bg-[#c8ba96] border-4 border-retro-black px-3 py-2 hover:bg-[#b8a986] active:translate-y-1 active:shadow-none shadow-[2px_2px_0_0_#000] font-vcr text-sm text-retro-black"
              >
                 COPY
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <span className="font-vcr text-xs text-retro-brick mb-1 uppercase opacity-50 block">Connected to Area:</span>
            <span className="font-pixel text-xl text-[#55a039] tracking-[0.2em]">{inviteCode}</span>
          </div>
        )}
      </div>

      <div className="w-full flex flex-col gap-6">
        <div className="w-full bg-[#f8f0d8] border-4 border-retro-black p-5 shadow-[6px_6px_0_0_#000] relative">
          <div className="flex items-center justify-between mb-5 border-b-4 border-retro-black/10 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">👥</span>
              <h2 className="font-vcr text-lg text-retro-black uppercase">
                Players ({players.length}/{maxPlayers})
              </h2>
            </div>
            {isReady && <span className="text-[#55a039] font-vcr text-xs animate-pulse">GETTING READY...</span>}
          </div>

          <div className="flex flex-col gap-4">
            {players.map((p) => {
              console.log(`Player ${p.name}: isReady=${p.isReady}, id=${p.id}, yourPlayerId=${yourPlayer?.id}`);
              return (
              <div 
                key={p.id} 
                className={`bg-white border-4 border-retro-black p-3 flex items-center justify-between shadow-[4px_4px_0_0_#000] transition-all ${p.isReady ? 'border-[#55a039]' : 'opacity-90'}`}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-8 h-8 border-4 border-retro-black shadow-[2px_2px_0_0_#000] relative" 
                    style={{ backgroundColor: p.color }}
                  >
                    <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white opacity-40"></div>
                  </div>
                  <span 
                    className="font-vcr text-lg tracking-tight"
                    style={{ color: p.color }}
                  >
                    {p.name} {p.id === yourPlayer?.id ? '(YOU)' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {(p.id === yourPlayer?.id ? localReady : p.isReady) && (
                    <div className="bg-[#55a039] text-white px-2 py-1 border-2 border-retro-black text-[10px] font-vcr animate-bounce">
                      READY
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <RetroButton 
            variant={localReady ? "danger" : "success"} 
            onClick={toggleReady}
            className="w-full py-5 text-2xl"
          >
            {localReady ? "NOT READY" : "READY!"}
          </RetroButton>
          
          <div className="flex gap-4 items-center mt-2">
            <button 
              onClick={handleLeaveRoom}
              className="font-vcr text-sm text-retro-black opacity-40 hover:opacity-100 uppercase underline"
            >
              EXIT ROOM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;