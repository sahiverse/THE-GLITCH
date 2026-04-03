import React, { useState, useEffect, useRef } from 'react';
import FloatingAssets from './FloatingAssets';
import CivilianWin from './CivilianWin';
import ImposterWin from './ImposterWin';
import CivilianDied from './CivilianDied';
import { ChatPanel } from './ChatPanel';

/**
 * EmergencyMeeting Component
 * 
 * Handles the voting phase of the game where players debate and vote
 * on who they suspect is the imposter. Manages multiple outcome states:
 * - Active voting with real-time vote counts
 * - Tie/no-elimination results
 * - Civilian elimination (with remaining player check)
 * - Imposter elimination (civilian victory)
 * - Game over win screens
 * 
 * Integrates with ChatPanel for discussion during meetings.
 */

interface PlayerObject {
  id: string
  name: string
  color: string
  role: string | null
  isReady: boolean
}

interface EmergencyMeetingProps {
  socket: any
  socketId: string
  roomCode: string
  players: PlayerObject[]
  lockedPlayers: string[]
  isVotedOut: boolean
  callerName: string
  isForced: boolean
  onMeetingEnd: () => void
  onGameOver: (data: any) => void
}

const EmergencyMeeting: React.FC<EmergencyMeetingProps> = ({
  socket,
  socketId,
  roomCode,
  players,
  lockedPlayers,
  isVotedOut,
  callerName,
  isForced,
  onMeetingEnd,
  onGameOver
}) => {
  const [hasVoted, setHasVoted] = useState(false)
  const [votedCount, setVotedCount] = useState(0)
  const [totalVoters, setTotalVoters] = useState(0)
  const [meetingResult, setMeetingResult] = useState<any>(null)
  const [showScreen, setShowScreen] = useState<'voting' | 'results' | 'civilian-died' | 'civilian-win' | 'imposter-win'>('voting')
  const [eliminatedPlayerName, setEliminatedPlayerName] = useState('')
  const [imposterName, setImposterName] = useState('')
  
  const onMeetingEndRef = useRef(onMeetingEnd)
  
  /**
   * Keep callback ref in sync with latest props.
   * Prevents stale closure issues in socket event handlers.
   */
  useEffect(() => {
    onMeetingEndRef.current = onMeetingEnd
  }, [onMeetingEnd])

  useEffect(() => {
    if (!socket) return

    const handleVoteUpdate = (data: any) => {
      setVotedCount(data.votedCount)
      setTotalVoters(data.totalVoters)
    }

    const handleVoteError = (data: any) => {
      // If vote failed server-side, allow re-voting
      if (data.error.includes('Cannot vote') || data.error.includes('already voted')) {
        setHasVoted(false)
      }
    }

    /**
     * Handle meeting results and route to appropriate screen.
     * 
     * Routing priority:
     * 1. Game over check (win/loss conditions)
     * 2. Tie or skip → Brief results, return to game
     * 3. Imposter eliminated → Civilian win
     * 4. Civilian eliminated + no civilians left → Imposter win
     * 5. Civilian eliminated + civilians remain → Death screen, return to game
     */
    const handleMeetingResult = (data: any) => {
      const outcome = data.outcome

      // Priority 1: Check for game-ending conditions before processing
      // other outcome types. Game over takes precedence over all UI states.
      if (outcome.gameOver) {
        if (outcome.winner === 'imposter') {
          const imposterPlayer = players.find(p => p.id === data.imposterId)
          setImposterName(imposterPlayer?.name || 'UNKNOWN')
          setShowScreen('imposter-win')
          return
        }
        if (outcome.winner === 'civilians') {
          const imposterPlayerName = data.eliminatedPlayerName || 'UNKNOWN'
          setImposterName(imposterPlayerName)
          setShowScreen('civilian-win')
          return
        }
      }

      // Outcome routing hierarchy (only evaluated if gameOver is false):
      // 
      // 1. Tie/no-elimination → Brief results display, return to game
      if (outcome.type === 'tie') {
        setMeetingResult(outcome)
        setShowScreen('results')
        setTimeout(() => {
          onMeetingEndRef.current()
        }, 3000)
        return
      }

      // 2. Imposter eliminated → Civilians win
      if (outcome.type === 'eliminated' && data.eliminatedPlayerRole === 'imposter') {
        const imposterPlayerName = data.eliminatedPlayerName || 'UNKNOWN'
        setImposterName(imposterPlayerName)
        setShowScreen('civilian-win')
        // Don't auto-close meeting - PLAY AGAIN button handles navigation
        return
      }

      // 3. Civilian eliminated → Check if imposter wins by elimination
      if (outcome.type === 'eliminated' && data.eliminatedPlayerRole === 'civilian') {
        // If no civilians remain → ImposterWin instead
        if (data.remainingCivilians === 0) {
          const imposterPlayer = players.find(p => p.id === data.imposterId)
          setImposterName(imposterPlayer?.name || 'UNKNOWN')
          setShowScreen('imposter-win')
          return
        }
        // Civilians still remain → show CivilianDied, then return to game
        setEliminatedPlayerName(data.eliminatedPlayerName || 'UNKNOWN')
        setShowScreen('civilian-died')
        return
      }

      // Fallback: if role missing but eliminated, check by imposterId
      if (outcome.type === 'eliminated' && !data.eliminatedPlayerRole) {
        if (outcome.eliminatedId === data.imposterId) {
          setImposterName(outcome.eliminatedName || 'UNKNOWN')
          setShowScreen('civilian-win')
        } else {
          if (data.remainingCivilians === 0) {
            const imposterPlayer = players.find(p => p.id === data.imposterId)
            setImposterName(imposterPlayer?.name || 'UNKNOWN')
            setShowScreen('imposter-win')
          } else {
            setEliminatedPlayerName(outcome.eliminatedName || 'UNKNOWN')
            setShowScreen('civilian-died')
          }
        }
        return
      }
    }

    /**
     * Handle edge case: new meeting triggered while results screen visible.
     * Resets component state to prepare for the new vote.
     */
    const handleNewMeeting = (data: any) => {
      setHasVoted(false)
      setVotedCount(0)
      setTotalVoters(0)
      setMeetingResult(null)
      setShowScreen('voting')
      setEliminatedPlayerName('')
      setImposterName('')
    }

    socket.on('vote_update', handleVoteUpdate)
    socket.on('vote_error', handleVoteError)
    socket.on('meeting_result', handleMeetingResult)
    socket.on('meeting_started', handleNewMeeting)

    return () => {
      socket.off('vote_update', handleVoteUpdate)
      socket.off('vote_error', handleVoteError)
      socket.off('meeting_result', handleMeetingResult)
      socket.off('meeting_started', handleNewMeeting)
    }
  }, [socket, socketId])

  const castVote = (targetId: string) => {
    if (hasVoted) return
    
    // Additional client-side validation
    if (targetId !== 'skip') {
      const targetPlayer = players.find(p => p.id === targetId)
      if (!targetPlayer) {
        console.log('Invalid vote target: player not found')
        return
      }
      if (lockedPlayers.includes(targetId)) {
        console.log('Cannot vote for voted-out player')
        return
      }
    }
    
    setHasVoted(true)
    socket?.emit('cast_meeting_vote', { targetId })
  }

  // Screen Renders for New Voting Outcomes
  if (showScreen === 'civilian-died') {
    return (
      <CivilianDied
        civilianName={eliminatedPlayerName}
        onPlayAgain={() => onMeetingEndRef.current()}
      />
    )
  }

  if (showScreen === 'civilian-win') {
    return (
      <CivilianWin
        imposterName={imposterName}
        onPlayAgain={() => { window.location.href = '/' }}
      />
    )
  }

  if (showScreen === 'imposter-win') {
    return (
      <ImposterWin
        imposterName={imposterName}
        onPlayAgain={() => { window.location.href = '/' }}
      />
    )
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
            {isForced
              ? '⏰ TIME IS UP — FINAL VOTE'
              : showScreen === 'voting'
                ? `${callerName} called an emergency meeting! Vote to eliminate.` 
                : 'Voting has ended!'
            }
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voting Area */}
          <div className="bg-[#f8f0d8] border-4 border-retro-black p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <h2 className="font-pixel text-2xl text-retro-red mb-6 text-center">VOTE FOR IMPOSTER</h2>
            
            {isVotedOut && (
              <div className="mb-4 p-3 bg-red-100 border-2 border-retro-red text-retro-red font-vcr text-sm text-center">
                💀 You have been voted out. You can still vote but cannot be voted for.
              </div>
            )}
            
            {showScreen === 'voting' && (
              <div className="space-y-3">
                {players
                  .filter(p => p && typeof p === 'object' && p.id && p.name && !lockedPlayers.includes(p.id) && p.id !== socketId && p.color && typeof p.color === 'string')
                  .map(player => (
                    <button
                      key={player.id}
                      onClick={() => castVote(player.id)}
                      disabled={hasVoted}
                      className={`w-full p-4 border-4 border-retro-black font-vcr text-lg transition-all
                        bg-retro-white text-retro-black hover:bg-retro-yellow
                        ${hasVoted
                          ? 'opacity-50 cursor-not-allowed'
                          : 'active:border-b-2 active:translate-y-1'
                        }`}
                    >
                      <div className="flex justify-between items-center">
                        <span style={{ color: player.color }}>{player.name}</span>
                      </div>
                    </button>
                  ))
                }
                
                {!isForced && (
                <div className="pt-4 flex justify-center">
                  <button
                    onClick={() => castVote('skip')}
                    disabled={hasVoted}
                    className={`px-6 py-2 border-4 border-retro-black font-vcr text-sm transition-all ${
                      hasVoted
                        ? 'bg-gray-500 text-retro-white'
                        : 'bg-retro-yellow text-retro-black hover:bg-yellow-300'
                    } ${
                      hasVoted ? 'opacity-50 cursor-not-allowed' : 'active:border-b-2 active:translate-y-1'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>SKIP VOTE</span>
                    </div>
                  </button>
                </div>
                )}

                <div className="text-center font-vcr text-sm text-retro-black/60 mt-4">
                  {votedCount} / {totalVoters} players voted
                </div>
              </div>
            )}

            {showScreen === 'results' && meetingResult && typeof meetingResult === 'object' && (
              <div className="space-y-3">
                <h3 className="font-pixel text-xl text-retro-black mb-4">
                  {meetingResult.type === 'tie'
                    ? meetingResult.message
                    : `${meetingResult.eliminatedName} HAS BEEN VOTED OUT` 
                  }
                </h3>
                {meetingResult.type !== 'tie' && (
                  <p className="font-vcr text-retro-black text-sm">{meetingResult.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="bg-[#f8f0d8] border-4 border-[#8B4513] shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col min-h-[200px]">
            <div className="p-4 bg-[#8B4513] border-b-4 border-[#8B4513]">
              <h3 className="text-[16px] font-['Press_Start_2P'] text-retro-white text-left">CHAT</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[500px]">
              <ChatPanel
                socket={socket}
                roomCode={roomCode}
                socketId={socketId}
                isVotedOut={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Brick Footer */}
      <div className="mario-ground fixed bottom-0 left-0 w-full h-16 z-50"></div>
    </div>
  );
};

export default EmergencyMeeting;
