/**
 * THE GLITCH - Main Application Component
 * 
 * Orchestrates the entire game flow from home screen through game completion.
 * Manages Socket.io connection, game state transitions, and coordinates
 * between various game phases:
 * 
 * 1. Home - Create or join game
 * 2. Name Entry - Player and room configuration  
 * 3. Room Lobby - Waiting for players
 * 4. Topic Selection - Voting on coding domain
 * 5. Role Reveal - Imposter/Civilian assignment
 * 6. Game - Collaborative coding phase
 * 7. Game Over - Win/loss display
 * 
 * @module App
 */

import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import RetroButton from './components/RetroButton';
import RoomLobby from './components/RoomLobby';
import FloatingAssets from './components/FloatingAssets';
import DomainVoting from './components/DomainVoting';
import ImposterReveal from './components/ImposterReveal';
import CivilianReveal from './components/CivilianReveal';
import CivilianGameRoom from './components/CivilianGameRoom';
import ImposterGameRoom from './components/ImposterGameRoom';
import ImposterWin from './components/ImposterWin';
import CivilianWin from './components/CivilianWin';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'home' | 'entering-name' | 'room' | 'role-reveal' | 'selecting-topic' | 'game' | 'game-over'>('home');
  const gameStateRef = useRef(gameState);
  const roleRevealCompletedRef = useRef(false);
  const [inviteCode, setInviteCode] = useState('');
  const [roleRevealCompleted, setRoleRevealCompleted] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);
  const [playerRole, setPlayerRole] = useState<'imposter' | 'civilian' | null>(null);
  const [gameOverImposterId, setGameOverImposterId] = useState<string | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [meetingsLeft, setMeetingsLeft] = useState<number>(2);
  const [pendingMeeting, setPendingMeeting] = useState<{ callerName: string; isForced: boolean } | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [socketId, setSocketId] = useState<string>('');
  const [roomData, setRoomData] = useState<any>(null);
  const [yourPlayer, setYourPlayer] = useState<any>(null);
  const [error, setError] = useState<string>('');
  
  /** Mirror state values in refs to avoid stale closures in socket event handlers. */
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  
  useEffect(() => {
    roleRevealCompletedRef.current = roleRevealCompleted;
  }, [roleRevealCompleted]);
  
  // Phase 2 state variables
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [voteData, setVoteData] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [winningTopic, setWinningTopic] = useState<string | null>(null);
  const [question, setQuestion] = useState<string>('');
  const [imposterQuestion, setImposterQuestion] = useState<string>('');
  const [testCases, setTestCases] = useState<any[]>([]);
  const [civilianTestCases, setCivilianTestCases] = useState<any[]>([]);

  // Phase 6 state variables (round system)
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [totalRounds, setTotalRounds] = useState<number>(2);
  const [timeLeft, setTimeLeft] = useState<number>(420);

  /**
   * Initialize Socket.io connection and wire up all game event handlers.
   * 
   * Event handlers update React state based on server broadcasts:
   * - Player joins/leaves/ready updates
   * - Game state transitions (topic selection, role assignment, game start)
   * - Emergency meetings and voting
   * - Round timer updates
   * 
   * Socket is established once on mount and cleaned up on unmount.
   */
  useEffect(() => {
    const newSocket = io(API_URL);
    
    newSocket.on('connect', () => {
      setSocketId(newSocket.id);
      setSocket(newSocket);
    });

    newSocket.on('room_joined', (data) => {
      setRoomData(data.room);
      setYourPlayer(data.yourPlayer);
      setInviteCode(data.room.code);
      setRoomName(data.room.roomName);
      setMaxPlayers(data.room.maxPlayers);
      setGameState('room');
      setError('');
    });

    newSocket.on('player_joined', (data) => {
      setRoomData((prev: any) => {
        if (!prev) return prev
        // Check if player already exists to avoid duplicates
        const exists = prev.players?.some((p: any) => p.id === data.player.id)
        if (exists) {
          // Update existing player
          return {
            ...prev,
            players: prev.players.map((p: any) =>
              p.id === data.player.id ? { ...p, ...data.player } : p
            )
          }
        }
        // Add new player
        return {
          ...prev,
          players: [...(prev.players || []), data.player]
        }
      })
    });

    newSocket.on('ready_update', (data) => {
      if (roomData) {
        setRoomData(prev => {
          const newRoomData = {
            ...prev,
            players: data.players
          };
          return newRoomData;
        });
        
        // Update yourPlayer ready state if it's you
        if (yourPlayer) {
          const updatedYourPlayer = data.players.find(p => p.id === yourPlayer.id);
          if (updatedYourPlayer) {
            setYourPlayer(updatedYourPlayer);
          }
        }
      } else {
        // Handle case where roomData is null - set it from event data
        setRoomData({
          code: inviteCode,
          roomName: roomName,
          maxPlayers: maxPlayers,
          players: data.players
        });
        
        // Update yourPlayer if it's you
        if (yourPlayer) {
          const updatedYourPlayer = data.players.find(p => p.id === yourPlayer.id);
          if (updatedYourPlayer) {
            setYourPlayer(updatedYourPlayer);
          }
        }
      }
    });

    newSocket.on('player_left', (data) => {
      // Always update roomData if available in the event
      if (data.room) {
        setRoomData(data.room);
        
        // Update yourPlayer if still in room
        if (yourPlayer) {
          const updatedYourPlayer = data.room.players.find(p => p.id === yourPlayer.id);
          if (updatedYourPlayer) {
            setYourPlayer(updatedYourPlayer);
          } else {
            // You were removed from room
            setYourPlayer(null);
          }
        }
      } else if (data.players && roomData) {
        // Use players array from event when room object is not available
        setRoomData(prev => ({
          ...prev,
          players: data.players
        }));
        
        // Update yourPlayer if still in room
        if (yourPlayer) {
          const updatedYourPlayer = data.players.find(p => p.id === yourPlayer.id);
          if (updatedYourPlayer) {
            setYourPlayer(updatedYourPlayer);
          } else {
            // You were removed from room
            setYourPlayer(null);
          }
        }
      } else if (roomData) {
        // Fallback to original logic
        setRoomData(prev => ({
          ...prev,
          players: data.players
        }));
        
        // If you were the one who left, clear yourPlayer
        if (data.playerId === socket.id) {
          setYourPlayer(null);
        } else if (yourPlayer) {
          // Update yourPlayer data if still in room
          const updatedYourPlayer = data.players.find(p => p.id === yourPlayer.id);
          if (updatedYourPlayer) {
            setYourPlayer(updatedYourPlayer);
          } else {
            // You were removed from room (host left and room was deleted)
            setYourPlayer(null);
          }
        }
      } else if (data.players) {
        // Handle case where roomData is null but players array is available
        setRoomData({
          code: inviteCode,
          roomName: roomName,
          maxPlayers: maxPlayers,
          players: data.players
        });
        
        // Update yourPlayer if still in room
        if (yourPlayer) {
          const updatedYourPlayer = data.players.find(p => p.id === yourPlayer.id);
          if (updatedYourPlayer) {
            setYourPlayer(updatedYourPlayer);
          } else {
            // You were removed from room
            setYourPlayer(null);
          }
        }
      }
    });

    newSocket.on('game_start', (data) => {
      // Note: Frontend now waits for role_assigned before showing topic selection
    });

    // Phase 2: Role Assignment
    newSocket.on('role_assigned', (data) => {
      setPlayerRole(data.role);
      // Do NOT change gameState here — role reveal happens after topic is selected
    });

    // Phase 2: Topic Selection Start
    newSocket.on('topic_selection_start', (data) => {
      setAvailableTopics(data.topics);
      setGameState('selecting-topic');
    });

    // Phase 2: Live Vote Updates
    newSocket.on('live_vote_update', (data) => {
      setVoteData(data);
    });

    // Phase 2: Topic Selected
    newSocket.on('topic_selected', (data) => {
      setSelectedTopic(data.topic);
      setWinningTopic(data.topic);
      // Show winning topic briefly then go to role reveal
      setTimeout(() => {
        setGameState('role-reveal');
      }, 2000);
    });

    // Phase 2: Game Data
    newSocket.on('game_data', (data) => {
      // Parse briefing object into role-specific mission brief strings
      const briefing = data.question?.base_description ? data.question : (data.question || {});
      
      // For civilians: base_description + constraints + test_case_explanations
      const civilianText = [
        briefing.base_description || '',
        briefing.constraints?.length
          ? '\nCONSTRAINTS:\n' + briefing.constraints.map((c: string) => `  • ${c}`).join('\n')
          : '',
        briefing.test_case_explanations?.length
          ? '\n\n' + briefing.test_case_explanations.join('\n\n')
          : ''
      ].join('');

      // For imposters: base_description + imposter_directive
      const imposterText = [
        briefing.base_description || '',
        briefing.imposter_directive
          ? '\n\n' + briefing.imposter_directive
          : ''
      ].join('');

      setQuestion(civilianText);
      setImposterQuestion(imposterText);
      setTestCases(data.testCases || []);
      // For imposters, use realTestCases for team progress; for civilians, use testCases
      setCivilianTestCases(data.realTestCases || data.testCases || []);
      // If role reveal already done, go straight to game
      if (gameStateRef.current === 'role-reveal' || roleRevealCompletedRef.current) {
        setGameState('game');
      }
      // Otherwise handleRoleRevealComplete will transition when animation finishes
    });

    // Phase 2: Game Ready
    newSocket.on('game_ready', (data) => {
      // This is a backup signal if game_data was missed
    });

    // Phase 2: Vote Error
    newSocket.on('vote_error', (data) => {
      setError(data.error || 'Voting error occurred');
    });
    newSocket.on('alive_count_update', (data) => {
      // Update room data with new alive count
      setRoomData(prev => prev ? {
        ...prev,
        aliveCount: data.aliveCount,
        totalCount: data.totalCount
      } : null);
    });

    newSocket.on('room_error', (data) => {
      setError(data.error);
    });

    newSocket.on('disconnect', () => {
    });

    // Meeting updates
    newSocket.on('meeting_started', (data) => {
      setMeetingsLeft(data.meetingsLeft);
      // Store meeting data and force-navigate to game room
      setPendingMeeting({
        callerName: data.callerName || 'SYSTEM',
        isForced: data.isForced || false
      });
      // Force all players into game state so they see the meeting
      setGameState('game');
    });

    newSocket.on('meeting_result', (data) => {
      // Clear pending meeting
      setPendingMeeting(null);
      
      // If this was a forced meeting, reset timer and increment round
      if (data.isForced) {
        setTimeLeft(420); // Reset to 7:00 (420 seconds)
        setCurrentRound(data.nextRound || currentRound + 1); // Increment to next round
      }
      
      // Update meetingsLeft
      if (typeof data.meetingsLeft === 'number') {
        setMeetingsLeft(data.meetingsLeft)
      }
      
      // Update lockedPlayers when someone is eliminated
      if (data.lockedPlayers && Array.isArray(data.lockedPlayers)) {
        setRoomData((prev: any) => {
          if (!prev) return prev
          return {
            ...prev,
            lockedPlayers: data.lockedPlayers,
            // Update aliveCount based on locked players
            aliveCount: (prev.players?.length || 0) - data.lockedPlayers.length
          }
        })
      }
    });

    // Game Over handler
    newSocket.on('game_over', (data) => {
      // Store imposter ID for win screen display
      if (data.imposterId) {
        setGameOverImposterId(data.imposterId);
      }
      
      // Update player role based on winner (for win screen display)
      if (data.winner === 'imposter') {
        setPlayerRole('imposter');
      } else if (data.winner === 'civilians') {
        setPlayerRole('civilian');
      }
      
      // Change game state to show win screen
      setGameState('game-over');
    });

    // Phase 6: Round System
    newSocket.on('round_started', (data) => {
      setCurrentRound(data.round);
      setTimeLeft(data.timeLeft);
      if (data.totalRounds !== undefined) {
        setTotalRounds(data.totalRounds);
        setRoomData(prev => prev ? { ...prev, totalRounds: data.totalRounds } : null);
      }
      if (typeof data.meetingsLeft === 'number') {
        setMeetingsLeft(data.meetingsLeft);
      }
    });

    newSocket.on('timer_tick', (data) => {
      setTimeLeft(data.timeLeft);
      setCurrentRound(data.round);
    });

    newSocket.on('round_resumed', (data) => {
      setTimeLeft(data.timeLeft);
      if (data.round !== undefined) {
        setCurrentRound(data.round);
      }
    });

    newSocket.on('round_ending', (data) => {
      // Do NOT update currentRound here — wait for round_started
      // which fires 3 seconds later with the authoritative value
    });

    newSocket.on('room_error', (data) => {
      setError(data.error);
    });

    newSocket.on('disconnect', () => {
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Handle language changes separately to avoid stale closure
  useEffect(() => {
    if (!socket) return;
    
    const handleLanguageChanged = (data) => {
      setSelectedLanguage(data.language);
    };
    
    socket.on('language_changed', handleLanguageChanged);
    
    return () => {
      socket.off('language_changed', handleLanguageChanged);
    };
  }, [socket]);

  const handleCreateRequest = () => {
    setPendingAction('create');
    setGameState('entering-name');
  };

  const handleJoinRequest = async () => {
    if (!inviteCode.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/room/${inviteCode}/exists`);
      const data = await response.json();
      
      if (!data.exists) {
        setError('Room not found');
        return;
      }
      
      if (data.currentPlayers >= data.maxPlayers) {
        setError('Room is full');
        return;
      }

      // Check if game is in restricted state (after topic voting)
      const isRestricted = data.gameState === 'in-game' || 
                           data.gameState === 'meeting' || 
                           (data.topic && data.gameState !== 'lobby');
      
      if (isRestricted) {
        setError('cant join room is live');
        return;
      }
      
      setPendingAction('join');
      setGameState('entering-name');
      setError('');
    } catch (err) {
      setError('Failed to check room');
    }
  };

  const handleConfirmName = async () => {
    if (!playerName.trim()) return;
    if (pendingAction === 'create' && !roomName.trim()) return;
    
    setError('');
    
    try {
      if (pendingAction === 'create') {
        // Create room via API
        const response = await fetch(`${API_URL}/room/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomName,
            nickname: playerName,
            maxPlayers,
            socketId
          })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          setError(result.error || 'Failed to create room');
          return;
        }
        
        // For room creation, set room data directly since creator is already added as player
        setRoomData({
          code: result.code,
          roomName: result.roomName,
          maxPlayers: result.maxPlayers,
          players: [result.player] // Creator is already in the room
        });
        setYourPlayer(result.player);
        setInviteCode(result.code);
        setRoomName(result.roomName);
        setMaxPlayers(result.maxPlayers);
        
        // Join socket room so others can join
        socket?.emit('join_room', {
          code: result.code,
          nickname: playerName
        });
        
        setGameState('room');
        setError('');
        
      } else if (pendingAction === 'join') {
        // Check room availability again before joining
        try {
          const checkResponse = await fetch(`${API_URL}/room/${inviteCode}/exists`);
          const checkData = await checkResponse.json();
          
          if (!checkData.exists) {
            setError('Room not found');
            return;
          }
          
          if (checkData.currentPlayers >= checkData.maxPlayers) {
            setError('Room is full');
            return;
          }

          // Check if game is in restricted state (after topic voting)
          if (checkData.gameState === 'in-game' || 
              checkData.gameState === 'meeting' || 
              (checkData.topic && checkData.gameState !== 'lobby')) {
            setError('cant join room is live');
            return;
          }
        } catch (err) {
          setError('Failed to check room');
          return;
        }
        
        // Join room via socket
        socket?.emit('join_room', {
          code: inviteCode,
          nickname: playerName
        });
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  const handleGameOver = React.useCallback((data: any) => {
  }, []);

  const handleBackToHome = () => {
    setGameState('home');
    setPendingAction(null);
  };

  const handleRoleRevealComplete = () => {
    roleRevealCompletedRef.current = true;
    setRoleRevealCompleted(true);
    // Always transition to game after role reveal — game_data may already be stored
    setTimeout(() => {
      setGameState('game');
    }, 500);
  };

  // Toggle bricks footer based on game state
  useEffect(() => {
    const marioGround = document.getElementById('main-mario-ground');
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
                    placeholder="ENTER THE ROOM CODE" 
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
               {error && (
                 <p className="font-vcr text-sm text-retro-red mt-2 uppercase animate-pulse">
                   {error}
                 </p>
               )}
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
                  <>
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
                    
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <p className="font-vcr text-lg text-retro-black mb-4 uppercase">
                        MAX PLAYERS:
                      </p>
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center gap-4 w-full">
                          <span className="font-vcr text-sm text-retro-black/70">3</span>
                          <input 
                            type="range" 
                            min="3" 
                            max="5" 
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(Number(e.target.value))}
                            className="flex-1 h-3 bg-retro-black/20 appearance-none cursor-pointer slider"
                            style={{
                              background: `linear-gradient(to right, #f19121 0%, #f19121 ${((maxPlayers - 3) / 2) * 100}%, #e8dab5 ${((maxPlayers - 3) / 2) * 100}%, #e8dab5 100%)`
                            }}
                          />
                          <span className="font-vcr text-sm text-retro-black/70">5</span>
                        </div>
                        <div className="bg-[#f19121] border-4 border-retro-black px-6 py-2 shadow-[2px_2px_0_0_#000]">
                          <span className="font-vcr text-2xl text-white font-bold">{maxPlayers}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                <RetroButton 
                  variant="success" 
                  onClick={handleConfirmName}
                  className="w-full !py-5 text-xl"
                  disabled={!playerName.trim() || (pendingAction === 'create' && !roomName.trim())}
                >
                  {pendingAction === 'create' ? 'START' : 'ENTER'}
                </RetroButton>

                {error && (
                  <div className="mt-4 text-center">
                    <p className="font-vcr text-sm text-retro-red uppercase animate-pulse">
                      {error}
                    </p>
                  </div>
                )}
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
            maxPlayers={maxPlayers}
            roomData={roomData}
            yourPlayer={yourPlayer}
            socket={socket}
            onStart={() => {}} // Game start is now server-driven
            onBack={() => setGameState('home')}
          />
        )}

        {gameState === 'selecting-topic' && (
          <DomainVoting 
            socket={socket}
            inviteCode={inviteCode}
            availableTopics={availableTopics}
            voteData={voteData}
          />
        )}

        {gameState === 'role-reveal' && (
          <>
            {playerRole === 'imposter' ? (
              <ImposterReveal 
                category={selectedTopic || 'DSA'} 
                totalRounds={totalRounds}
                onComplete={handleRoleRevealComplete} 
              />
            ) : (
              <CivilianReveal 
                category={selectedTopic || 'DSA'} 
                onComplete={handleRoleRevealComplete} 
              />
            )}
          </>
        )}

        {gameState === 'game-over' && (
          <>
            {playerRole === 'imposter' ? (
              <ImposterWin 
                imposterName={
                  roomData?.players?.find((p: any) => 
                    gameOverImposterId ? p.id === gameOverImposterId : p.role === 'imposter'
                  )?.name || roomData?.players?.find((p: any) => p.role === 'imposter')?.name || 'Unknown'
                }
                onPlayAgain={handleBackToHome} 
              />
            ) : (
              <CivilianWin 
                imposterName={
                  roomData?.players?.find((p: any) => 
                    gameOverImposterId ? p.id === gameOverImposterId : p.role === 'imposter'
                  )?.name || roomData?.players?.find((p: any) => p.role === 'imposter')?.name || 'Unknown'
                } 
                onPlayAgain={handleBackToHome} 
              />
            )}
          </>
        )}

        {gameState === 'game' && (
    <>
      {playerRole === 'imposter' ? (
        <ImposterGameRoom
          category={'SOURCE'}
          domain={selectedTopic || roomData?.topic || ''}
          socket={socket}
          socketId={socketId}
          roomCode={inviteCode}
          players={roomData?.players || []}
          yourPlayer={yourPlayer}
          question={imposterQuestion}
          sabotageTestCases={testCases}
          testCases={civilianTestCases}
          currentRound={currentRound}
          totalRounds={totalRounds}
          timeLeft={timeLeft}
          lockedPlayers={roomData?.lockedPlayers || []}
          roomData={roomData}
          language={selectedLanguage}
          meetingsLeft={meetingsLeft}
          maxPlayers={maxPlayers}
          pendingMeeting={pendingMeeting}
          onGameOver={handleGameOver}
        />
      ) : (
        <CivilianGameRoom
          category={'SOURCE'}
          domain={selectedTopic || roomData?.topic || ''}
          socket={socket}
          socketId={socketId}
          roomCode={inviteCode}
          players={roomData?.players || []}
          yourPlayer={yourPlayer}
          question={question}
          testCases={testCases}
          currentRound={currentRound}
          totalRounds={totalRounds}
          timeLeft={timeLeft}
          lockedPlayers={roomData?.lockedPlayers || []}
          roomData={roomData}
          language={selectedLanguage}
          meetingsLeft={meetingsLeft}
          maxPlayers={maxPlayers}
          pendingMeeting={pendingMeeting}
          onGameOver={handleGameOver}
        />
      )}
    </>
  )}
  </div>
</div>
  );
};

export default App;