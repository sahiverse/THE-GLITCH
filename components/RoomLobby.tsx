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
  onStart: () => void;
  onBack: () => void;
}

const RoomLobby: React.FC<RoomLobbyProps> = ({ inviteCode, roomName, playerName, isHost, onStart, onBack }) => {
  const [isReady, setIsReady] = useState(false);
  const [inputCode, setInputCode] = useState(isHost ? inviteCode : '');
  const [isVerified, setIsVerified] = useState(isHost);
  
  // Define the 6 colors for players
  const playerColors = [
    { name: 'blue', class: 'text-blue-500', hex: '#3b82f6' },
    { name: 'pink', class: 'text-pink-500', hex: '#ec4899' },
    { name: 'red', class: 'text-red-500', hex: '#ef4444' },
    { name: 'green', class: 'text-green-500', hex: '#10b981' },
    { name: 'orange', class: 'text-orange-500', hex: '#f97316' },
    { name: 'purple', class: 'text-purple-500', hex: '#a855f7' }
  ];

  // Assign random colors to players
  const [players, setPlayers] = useState<Player[]>([
    { id: '2', name: 'AHMAD', color: playerColors[1].hex, isHost: false, isReady: true },
  ]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isVerified) return;
    const timer1 = setTimeout(() => {
      setPlayers(prev => [
        ...prev, 
        { id: '3', name: 'LUIGI_99', color: playerColors[3].hex, isHost: false, isReady: false }
      ]);
    }, 2000);
    const timer2 = setTimeout(() => {
      setPlayers(prev => [
        ...prev, 
        { id: '4', name: 'PIXEL_QUEEN', color: playerColors[2].hex, isHost: false, isReady: true }
      ]);
    }, 5000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isVerified]);

  useEffect(() => {
    const allPlayersReady = players.every(p => p.isReady) && isReady;
    if (allPlayersReady && players.length > 0) {
      const timer = setTimeout(() => onStart(), 1000);
      return () => clearTimeout(timer);
    }
  }, [players, isReady, onStart]);

  const toggleReady = () => {
    setIsReady(!isReady);
    if (!isReady) {
      setPlayers(prev => prev.map(p => ({...p, isReady: true})));
    }
  };

  const handleVerify = () => {
    setIsVerified(true);
    setError(false);
  };

  const currentPlayer: Player = {
    id: '1',
    name: playerName || 'PLAYER',
    color: playerColors[Math.floor(Math.random() * playerColors.length)].hex,
    isHost: isHost,
    isReady: isReady
  };

  const displayPlayers = [currentPlayer, ...players];
  const displayedTitle = isHost ? (roomName || 'BATTLE ARENA') : (inviteCode || inputCode || 'BATTLE ARENA');

  if (!isVerified) {
    return (
      <div className="flex flex-col items-center w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-3xl md:text-4xl text-[#f19121] drop-shadow-[4px_4px_0px_#000] uppercase mb-8 font-pixel text-center">
          JOIN ROOM
        </h1>

        <div className={`w-full bg-[#f8f0d8] border-4 border-retro-black p-8 shadow-[6px_6px_0_0_#000] relative flex flex-col items-center transition-transform ${error ? 'animate-shake' : ''}`}>
          <p className="font-vcr text-lg text-retro-brick mb-6 uppercase tracking-tight text-center">
            PROVE YOU BELONG HERE.<br/>ENTER THE INVITE CODE:
          </p>
          
          <input 
            type="text" 
            autoFocus
            value={inputCode}
            placeholder="INVITE CODE"
            maxLength={20}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            className={`w-full bg-[#e8dab5] border-4 border-retro-black p-4 font-pixel text-2xl text-center outline-none focus:bg-white transition-colors placeholder:opacity-20 mb-2 ${error ? 'text-retro-red border-retro-red' : 'text-retro-red'}`}
          />

          <div className="h-6 mb-4">
            {error && <p className="font-vcr text-sm text-retro-red uppercase animate-pulse">INVALID INVITE CODE</p>}
          </div>

          <RetroButton 
            variant="success" 
            onClick={handleVerify}
            className="w-full py-4 text-xl"
            disabled={inputCode.length < 1}
          >
            ENTER ROOM
          </RetroButton>

          <div className="mt-8">
            <button 
              onClick={onBack}
              className="font-vcr text-sm text-retro-black opacity-40 hover:opacity-100 uppercase underline transition-opacity"
            >
              EXIT ROOM
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <span className="font-pixel text-xl text-[#55a039] tracking-[0.2em]">{inviteCode || inputCode}</span>
          </div>
        )}
      </div>

      <div className="w-full flex flex-col gap-6">
        <div className="w-full bg-[#f8f0d8] border-4 border-retro-black p-5 shadow-[6px_6px_0_0_#000] relative">
          <div className="flex items-center justify-between mb-5 border-b-4 border-retro-black/10 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">👥</span>
              <h2 className="font-vcr text-lg text-retro-black uppercase">
                Players ({displayPlayers.length}/5)
              </h2>
            </div>
            {isReady && <span className="text-[#55a039] font-vcr text-xs animate-pulse">GETTING READY...</span>}
          </div>

          <div className="flex flex-col gap-4">
            {displayPlayers.map((p) => (
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
                    className={`font-vcr text-lg tracking-tight ${p.id === '1' ? 'text-red-500' : ''}`}
                    style={{ color: p.id !== '1' ? p.color : undefined }}
                  >
                    {p.name} {p.id === '1' ? '(YOU)' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {p.isReady && (
                    <div className="bg-[#55a039] text-white px-2 py-1 border-2 border-retro-black text-[10px] font-vcr animate-bounce">
                      READY
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <RetroButton 
            variant={isReady ? "danger" : "success"} 
            onClick={toggleReady}
            className="w-full py-5 text-2xl"
          >
            {isReady ? "NOT READY" : "READY!"}
          </RetroButton>
          
          <div className="flex gap-4 items-center mt-2">
            <button 
              onClick={onBack}
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