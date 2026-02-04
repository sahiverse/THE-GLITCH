import React, { useState, useEffect } from 'react';
import { GameState, ChatMessage } from './types';
import FloatingAssets from './FloatingAssets';
import CivilianWin from './CivilianWin';
import ImposterWin from './ImposterWin';
import CivilianDied from './CivilianDied';

interface EmergencyMeetingProps {
  players: string[];
  currentUser: string;
  onVote: (votedPlayer: string) => void;
  onSkip: () => void;
  onMeetingEnd: () => void;
  gameState: GameState;
  calledBy: string;
  userColors?: Record<string, string>;
  onGameEnd?: (result: 'civilian-win' | 'imposter-win') => void;
  onCivilianDied?: (deadPlayer: string) => void;
  imposterName?: string;
  alivePlayers?: string[];
}

interface VoteMessage extends ChatMessage {
  votedFor?: string;
}

const EmergencyMeeting: React.FC<EmergencyMeetingProps> = ({
  players,
  currentUser,
  onVote,
  onSkip,
  onMeetingEnd,
  gameState,
  calledBy,
  userColors = {},
  onGameEnd,
  onCivilianDied,
  imposterName = '',
  alivePlayers = players
}) => {
  const [meetingPhase, setMeetingPhase] = useState<'announcement' | 'voting' | 'results' | 'game-end'>('voting');
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<VoteMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [gameResult, setGameResult] = useState<'civilian-win' | 'imposter-win' | null>(null);
  const [deadPlayer, setDeadPlayer] = useState<string | null>(null);

  useEffect(() => {
    console.log('Emergency Meeting Phase:', meetingPhase);
    
    if (meetingPhase === 'announcement') {
      console.log('Starting announcement timer...');
      const timer = setTimeout(() => {
        console.log('Transitioning to voting phase');
        setMeetingPhase('voting');
      }, 4000);
      return () => clearTimeout(timer);
    }

    // Removed voting timer - voting stays open until all players vote
    
    if (meetingPhase === 'results') {
      console.log('Starting results timer...');
      const timer = setTimeout(() => {
        console.log('Processing game results...');
        processGameResults();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [meetingPhase]);

  // Process game results and determine outcome
  const processGameResults = () => {
    const voteResults = getVoteResults();
    const maxVotes = Math.max(...Object.values(voteResults), 0);
    const votedOutPlayer = maxVotes > 0 ? 
      Object.entries(voteResults).find(([_, count]) => count === maxVotes)?.[0] : null;
    
    console.log('🗳️ Processing game results:', { voteResults, maxVotes, votedOutPlayer, round: gameState.round });
    
    // Get current alive players count
    const alivePlayersCount = alivePlayers?.length || players.length;
    
    // Check if someone was voted out
    if (votedOutPlayer && votedOutPlayer !== 'SKIP') {
      // Check if voted out player is the imposter
      if (votedOutPlayer === imposterName) {
        // CIVILIAN WIN: Majority votes for imposter
        console.log('🎉 Civilians win! Imposter was voted out.');
        setGameResult('civilian-win');
        setMeetingPhase('game-end');
        return;
      } else {
        // WRONG ELIMINATION: Civilian voted out
        console.log('💀 Wrong elimination! Civilian died:', votedOutPlayer);
        if (onCivilianDied) {
          onCivilianDied(votedOutPlayer);
        }
        setGameResult('civilian-died');
        setMeetingPhase('game-end');
        return;
      }
    }
    
    // No one was voted out (skip or tie)
    console.log('⏭️ No one voted out, checking imoster win conditions...');
    
    // IMPOSTER WIN CONDITIONS
    // Condition 1: Only 2 people left + Imposter gets less votes
    if (alivePlayersCount <= 2) {
      console.log('🦹 Imposter wins! Only 2 people left.');
      setGameResult('imposter-win');
      setMeetingPhase('game-end');
      return;
    }
    
    // Condition 2: Round 3 voting + Imposter gets less votes
    if (gameState.round >= 3) {
      console.log('🦹 Imposter wins! Round 3 completed and imposter survived.');
      setGameResult('imposter-win');
      setMeetingPhase('game-end');
      return;
    }
    
    // Game continues to next round
    console.log('🔄 Game continues to next round');
    onMeetingEnd();
  };

  // Check if all players have voted
  useEffect(() => {
    const eligibleVoters = players.filter(p => p !== currentUser);
    const currentVotes = Object.keys(votes).filter(voter => voter !== currentUser);
    
    if (meetingPhase === 'voting' && currentVotes.length >= eligibleVoters.length) {
      setMeetingPhase('results');
    }
  }, [votes, meetingPhase, players, currentUser]);

  const handleSendMessage = (text: string) => {
    if (text.trim()) {
      const newMessage: VoteMessage = {
        id: Date.now().toString(),
        user: currentUser,
        text: text.trim(),
        color: getUserColor(currentUser),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      setInputValue('');
    }
  };

  const handleVote = (playerName: string) => {
    if (meetingPhase !== 'voting' || votes[currentUser]) return;
    
    setVotes(prev => ({ ...prev, [currentUser]: playerName }));
    
    // Removed system message for voting
  };

  const handleSkip = () => {
    if (meetingPhase !== 'voting' || votes[currentUser]) return;
    
    setVotes(prev => ({ ...prev, [currentUser]: 'SKIP' }));
    
    // Removed system message for skipping
  };

  // Function to get consistent user colors
  const getUserColor = (username: string): string => {
    // Use passed colors first, then fallback to defaults
    if (userColors[username]) {
      return userColors[username];
    }
    
    // Default color assignments
    const defaultColors: Record<string, string> = {
      'You': '#00ff00',
      'X_Pixel_X': '#ff6b6b',
      'GlitchMaster': '#4ecdc4',
      'CodeNinja': '#45b7d1',
      'ByteMaster': '#f9ca24'
    };
    return defaultColors[username] || '#ffffff';
  };

  const getVoteCount = (playerName: string) => {
    return Object.values(votes).filter(vote => vote === playerName).length;
  };

  const getVoteResults = () => {
    const results: Record<string, number> = {};
    Object.values(votes).forEach(vote => {
      if (vote !== 'SKIP' && typeof vote === 'string') {
        results[vote] = (results[vote] || 0) + 1;
      }
    });
    return results;
  };

  // Game Ending Scenarios
  if (meetingPhase === 'game-end') {
    // Civilian Win
    if (gameResult === 'civilian-win') {
      return (
        <CivilianWin 
          imposterName={imposterName}
          onPlayAgain={() => {
            if (onGameEnd) onGameEnd('civilian-win');
          }}
        />
      );
    }
    
    // Imposter Win
    if (gameResult === 'imposter-win') {
      return (
        <ImposterWin 
          imposterName={imposterName}
          onPlayAgain={() => {
            if (onGameEnd) onGameEnd('imposter-win');
          }}
        />
      );
    }

    // Civilian Died
    if (gameResult === 'civilian-died') {
      return (
        <CivilianDied 
          civilianName={currentUser}
          onPlayAgain={() => {
            // Call onCivilianDied to update alive players count
            if (onCivilianDied) {
              onCivilianDied(currentUser);
            }
            // End meeting and return to game room
            onMeetingEnd();
          }}
        />
      );
    }
    
    // Civilian Died (legacy check)
    if (deadPlayer) {
      return (
        <CivilianDied 
          deadPlayerName={deadPlayer}
          onContinue={() => {
            onMeetingEnd();
          }}
        />
      );
    }
  }
  if (meetingPhase === 'announcement') {
    return (
      <div className="h-screen w-screen overflow-hidden relative bg-retro-sky">
        {/* Floating Assets Background */}
        <FloatingAssets />

        {/* Emergency Meeting Announcement */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 pb-16">
          <div className="text-center animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="relative inline-block text-4xl md:text-6xl text-retro-red drop-shadow-[8px_8px_0px_#000] uppercase mb-6 select-none italic tracking-tight font-pixel">
              EMERGENCY MEETING!
            </h1>
            <div className="text-retro-white text-base md:text-lg font-vcr uppercase mb-4">
              Called by <span className="text-white font-bold">{calledBy}</span>
            </div>
            <div className="text-retro-white/70 text-sm md:text-base font-vcr">
              Voting will begin shortly...
            </div>
          </div>
        </div>

        {/* Brick Footer */}
        <div className="mario-ground fixed bottom-0 left-0 w-full h-16 z-50"></div>
      </div>
    );
  }

  // Voting and Results Phase
  return (
    <div className="h-screen w-screen overflow-hidden relative bg-retro-sky">
      {/* Floating Assets Background */}
      <FloatingAssets />

      {/* Voting Modal */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 pb-16">
        {/* Emergency Meeting Title */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="relative inline-block text-4xl md:text-6xl text-retro-red drop-shadow-[8px_8px_0px_#000] uppercase mb-4 select-none italic tracking-tight font-pixel">
            EMERGENCY MEETING!
          </h1>
          <div className="text-retro-white text-sm md:text-base font-vcr">
            {meetingPhase === 'voting' && 'Vote to eliminate the player or skip'}
            {meetingPhase === 'results' && 'Voting has ended!'}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voting Area */}
          <div className="bg-[#f8f0d8] border-4 border-retro-black p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <h2 className="font-pixel text-2xl text-retro-red mb-6 text-center">VOTE FOR IMPOSTER</h2>
            
            {meetingPhase === 'voting' && (
              <div className="space-y-3">
                {players.filter(player => player !== currentUser).map(player => (
                  <button
                    key={player}
                    onClick={() => handleVote(player)}
                    disabled={votes[currentUser] !== undefined}
                    className={`w-full p-4 border-4 border-retro-black font-vcr text-lg transition-all ${
                      votes[currentUser] === player
                        ? 'bg-retro-red text-retro-white'
                        : 'bg-retro-white text-retro-black hover:bg-retro-yellow'
                    } ${
                      votes[currentUser] !== undefined ? 'opacity-50 cursor-not-allowed' : 'active:border-b-2 active:translate-y-1'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span 
                        className={userColors?.[player] || 'text-retro-black'}
                      >
                        {player}
                      </span>
                      <span className="text-sm">({getVoteCount(player)} votes)</span>
                    </div>
                  </button>
                ))}
                
                <div className="pt-4 flex justify-center">
                  <button
                    onClick={handleSkip}
                    disabled={votes[currentUser] !== undefined}
                    className={`px-6 py-2 border-4 border-retro-black font-vcr text-sm transition-all ${
                      votes[currentUser] === 'SKIP'
                        ? 'bg-gray-500 text-retro-white'
                        : 'bg-retro-yellow text-retro-black hover:bg-yellow-300'
                    } ${
                      votes[currentUser] !== undefined ? 'opacity-50 cursor-not-allowed' : 'active:border-b-2 active:translate-y-1'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>SKIP VOTE</span>
                      <span className="text-xs">({getVoteCount('SKIP')})</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {meetingPhase === 'results' && (
              <div className="space-y-3">
                <h3 className="font-pixel text-xl text-retro-black mb-4">VOTING RESULTS</h3>
                {Object.entries(getVoteResults())
                  .sort(([,a], [,b]) => b - a)
                  .map(([player, count]) => (
                    <div key={player} className="flex justify-between items-center p-3 bg-retro-white border-2 border-retro-black">
                      <span 
                        className={`font-vcr text-lg ${userColors?.[player] || 'text-retro-black'}`}
                      >
                        {player}
                      </span>
                      <span className="font-pixel text-xl text-retro-red">{count} votes</span>
                    </div>
                  ))}
                {getVoteCount('SKIP') > 0 && (
                  <div className="flex justify-between items-center p-3 bg-gray-200 border-2 border-retro-black">
                    <span className="font-vcr text-lg">SKIP</span>
                    <span className="font-pixel text-xl text-gray-600">{getVoteCount('SKIP')} votes</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="bg-[#f8f0d8] border-4 border-[#8B4513] shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col">
            <div className="p-4 bg-[#8B4513] border-b-4 border-[#8B4513]">
              <h3 className="text-[16px] font-['Press_Start_2P'] text-retro-white text-left">CHAT</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96 bg-[#f8f0d8]">
              {messages.map((msg) => (
                <div key={msg.id} className="leading-tight">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: msg.color }} className="font-['Press_Start_2P'] text-[10px]">
                      {msg.user}:
                    </span>
                    <span className="text-[8px] text-gray-600">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="bg-[#e8dcc0] p-3 border border-[#8B4513] rounded">
                    <span className="text-retro-black font-vcr text-sm break-words">
                      {msg.text}
                    </span>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-gray-600 font-vcr text-sm py-8">
                  No messages yet. Start chatting!
                </div>
              )}
            </div>

            {meetingPhase === 'voting' && (
              <div className="p-4 bg-[#8B4513] border-t-4 border-[#8B4513]">
                <div className="flex space-x-2">
                  <input 
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type message..."
                    className="flex-1 bg-retro-white border-2 border-[#8B4513] text-retro-black p-3 font-vcr text-sm focus:outline-none focus:border-[#A0522D] placeholder:opacity-50 rounded"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                  />
                  <button 
                    onClick={() => handleSendMessage(inputValue)}
                    className="px-4 py-3 bg-[#f8f0d8] text-retro-black font-['Press_Start_2P'] text-[10px] border-4 border-[#8B4513] border-b-8 border-r-8 active:border-b-4 active:border-r-4 active:translate-y-1 active:translate-x-1 transition-all rounded flex items-center justify-center"
                    title="Send message"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Brick Footer */}
      <div className="mario-ground fixed bottom-0 left-0 w-full h-16 z-50"></div>
    </div>
  );
};

export default EmergencyMeeting;
