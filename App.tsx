import React, { useState, useEffect } from 'react';
import RetroButton from './components/RetroButton';
import RoomLobby from './components/RoomLobby';
import FloatingAssets from './components/FloatingAssets';
import CategorySelection from './components/CategorySelection';
import DomainVoting from './components/DomainVoting';
import ImposterReveal from './components/ImposterReveal';
import CivilianReveal from './components/CivilianReveal';
import CivilianGameRoom from './components/CivilianGameRoom';
import ImposterGameRoom from './components/ImposterGameRoom';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'home' | 'entering-name' | 'room' | 'selecting-category' | 'selecting-domain' | 'role-reveal' | 'game'>('home');
  const [inviteCode, setInviteCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'SOURCE' | 'README' | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'imposter' | 'civilian' | null>(null);

  const handleCreateRequest = () => {
    setPendingAction('create');
    setGameState('entering-name');
  };

  const handleJoinRequest = () => {
    if (inviteCode.trim()) {
      setPendingAction('join');
      setGameState('entering-name');
    }
  };

  const handleConfirmName = () => {
    if (!playerName.trim()) return;
    if (pendingAction === 'create' && !roomName.trim()) return;
    
    if (pendingAction === 'create') {
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setInviteCode(randomCode);
    }
    
    setGameState('room');
  };

  const handleBackToHome = () => {
    setGameState('home');
    setPendingAction(null);
  };

  const handleFullReset = () => {
    setGameState('home');
    setInviteCode('');
    setRoomName('');
    setPlayerName('');
    setPendingAction(null);
    setSelectedCategory(null);
    setSelectedDomain(null);
  };

  const handleStartSelection = () => {
    setGameState('selecting-category');
  };

  const handleCategoryConfirm = (category: 'SOURCE' | 'README') => {
    setSelectedCategory(category);
    setGameState('selecting-domain');
  };

  const handleDomainConfirm = (domain: string) => {
    setSelectedDomain(domain);
    
    // Force civilian role for testing
    setPlayerRole('civilian');
    setGameState('role-reveal');
  };

  const handleRoleRevealComplete = () => {
    setGameState('game');
  };

  // Toggle bricks footer based on game state
  useEffect(() => {
    const marioGround = document.querySelector('.mario-ground');
    if (marioGround) {
      if (gameState === 'game') {
        marioGround.classList.add('hidden');
      } else {
        marioGround.classList.remove('hidden');
      }
    }
  }, [gameState]);

  // Using vcr font for inputs
  const inputStyles = "w-full bg-[#e8dab5] border-4 border-retro-black p-3 font-vcr text-lg md:text-xl uppercase text-retro-black/70 transition-all duration-150 outline-none placeholder:text-retro-black/30 shadow-[inset:4px_4px_0_0_rgba(0,0,0,0.1)]";

  return (
    <div className={`h-full w-full flex flex-col items-center justify-center relative bg-retro-sky overflow-hidden ${
      gameState === 'game' ? 'p-0' : 'p-4 pb-[64px]'
    }`}>
      {/* Background Layer - Only show when not in game */}
      {gameState !== 'game' && <FloatingAssets />}

      {/* Foreground Content */}
      <div className={`z-10 w-full flex flex-col items-center justify-center ${
        gameState === 'game' ? 'h-full max-w-none' : 'max-w-4xl h-full'
      }`}>
        
        {/* Universal Title Section - Clean without grey overlays */}
        {(gameState === 'home' || gameState === 'entering-name') && (
          <div className="text-center mb-11 animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="relative inline-block text-6xl md:text-8xl text-retro-red drop-shadow-[8px_8px_0px_#000] uppercase mb-2 select-none italic tracking-tight font-pixel">
              The Glitch
            </h1>
            <p className="font-vcr text-lg text-retro-black/50 uppercase tracking-wide">
              Mafia for Coders
            </p>
          </div>
        )}

        {/* HOME VIEW - Polished with VCR font */}
        {gameState === 'home' && (
          <div className="flex flex-col items-center w-full max-w-xl animate-in fade-in zoom-in duration-300">
            
            {/* Create Game Button */}
            <RetroButton 
              variant="orange" 
              onClick={handleCreateRequest}
              className="w-full py-5 text-xl md:text-2xl mb-4"
            >
              CREATE GAME
            </RetroButton>

            {/* Join Box */}
            <div className="w-full bg-[#f8f0d8] border-4 border-retro-black p-6 md:p-8 shadow-[6px_6px_0_0_#000] relative mb-4">
              <p className="font-vcr text-lg md:text-xl text-retro-black mb-4 tracking-normal">
                Or join a game...
              </p>
              
              <div className="flex flex-row gap-4 items-stretch">
                <div className="flex-[2] relative">
                  <input 
                    type="text" 
                    placeholder="ENTER ROOM NAME" 
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRequest()}
                    className={inputStyles}
                  />
                </div>
                
                <RetroButton 
                  variant="success" 
                  onClick={handleJoinRequest}
                  className="flex-1 !px-0 !py-0 text-sm md:text-xl flex items-center justify-center"
                  disabled={!inviteCode}
                >
                  JOIN
                </RetroButton>
              </div>
            </div>

            {/* Footer Text - VCR Font */}
            <div className="text-center">
               <p className="font-vcr text-lg md:text-xl text-retro-black/50 tracking-wide uppercase">
                 3-5 Players • Find the Glitch
               </p>
            </div>
          </div>
        )}

        {/* NAME ENTRY VIEW - Polished with VCR font */}
        {gameState === 'entering-name' && (
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-full bg-[#f8f0d8] border-4 border-retro-black p-8 shadow-[6px_6px_0_0_#000] relative">
              <div className="flex flex-col gap-8">
                <div>
                  <p className="font-vcr text-lg text-retro-black mb-4 uppercase">
                    ENTER NICKNAME:
                  </p>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="DEVELOPER" 
                      autoFocus
                      value={playerName}
                      maxLength={10}
                      onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                      className={inputStyles}
                    />
                  </div>
                </div>

                {pendingAction === 'create' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <p className="font-vcr text-lg text-retro-black mb-4 uppercase">
                      NAME ARENA:
                    </p>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="ALPHA BASE" 
                        value={roomName}
                        maxLength={15}
                        onChange={(e) => setRoomName(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirmName()}
                        className={inputStyles}
                      />
                    </div>
                  </div>
                )}
                
                <RetroButton 
                  variant="success" 
                  onClick={handleConfirmName}
                  className="w-full !py-5 text-xl"
                  disabled={!playerName.trim() || (pendingAction === 'create' && !roomName.trim())}
                >
                  {pendingAction === 'create' ? 'START' : 'ENTER'}
                </RetroButton>
              </div>

              <div className="mt-8 text-center">
                <button 
                  onClick={handleBackToHome}
                  className="font-vcr text-sm text-retro-brick/60 hover:text-retro-brick uppercase underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'room' && (
          <RoomLobby 
            inviteCode={inviteCode} 
            roomName={roomName}
            playerName={playerName}
            isHost={pendingAction === 'create'}
            onStart={handleStartSelection}
            onBack={handleFullReset}
          />
        )}

        {gameState === 'selecting-category' && (
          <CategorySelection onConfirm={handleCategoryConfirm} />
        )}

        {gameState === 'selecting-domain' && (
          <DomainVoting onConfirm={handleDomainConfirm} />
        )}

        {gameState === 'role-reveal' && (
          <>
            {playerRole === 'imposter' ? (
              <ImposterReveal 
                category={selectedCategory || 'SOURCE'} 
                onComplete={handleRoleRevealComplete} 
              />
            ) : (
              <CivilianReveal 
                category={selectedCategory || 'SOURCE'} 
                onComplete={handleRoleRevealComplete} 
              />
            )}
          </>
        )}

        {gameState === 'game' && (
          <>
            {playerRole === 'imposter' ? (
              <ImposterGameRoom 
                category={selectedCategory || 'SOURCE'} 
                domain={selectedDomain || 'ALGORITHMS'}
              />
            ) : (
              <CivilianGameRoom 
                category={selectedCategory || 'SOURCE'} 
                domain={selectedDomain || 'ALGORITHMS'}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;