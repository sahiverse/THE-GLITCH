import React from 'react';
import { useMeeting } from '../src/hooks/useMeeting';
import { ChatPanel } from './ChatPanel';

interface PlayerObject {
  id: string;
  name: string;
  color: string;
  role: string | null;
  isReady: boolean;
}

interface MeetingOverlayProps {
  socket: any;
  roomCode: string;
  socketId: string;
  isVotedOut: boolean;
  currentRound: number;
  onGameOver: (data: any) => void;
}

export const MeetingOverlay: React.FC<MeetingOverlayProps> = ({ 
  socket, 
  roomCode, 
  socketId, 
  isVotedOut, 
  currentRound,
  onGameOver 
}) => {
  const {
    meetingActive,
    callerName,
    players,
    lockedPlayers,
    votedCount,
    totalVoters,
    hasVoted,
    meetingResult,
    meetingsLeft,
    isForced,
    isLastRound,
    error,
    callMeeting,
    castVote
  } = useMeeting({ socket, roomCode, socketId, isVotedOut, onGameOver });
  
  const activePlayers = players.filter(p => !lockedPlayers.includes(p.id));
  const isOwnPlayer = (playerId: string) => playerId === socketId;
  
  // Emergency Meeting Button (shown during normal gameplay)
  if (!meetingActive) {
    return (
      <>
        {error && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded z-50">
            {error}
          </div>
        )}
        
        <button
          onClick={callMeeting}
          disabled={isVotedOut || meetingsLeft <= 0}
          className={`fixed bottom-20 right-4 px-4 py-2 rounded-lg font-bold z-40 transition-colors ${
            isVotedOut || meetingsLeft <= 0
              ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
          }`}
        >
          🚨 EMERGENCY MEETING
          <div className="text-xs mt-1">
            ({meetingsLeft} left)
          </div>
        </button>
      </>
    );
  }
  
  // Meeting Overlay
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="text-center py-4 border-b border-gray-700">
        <h1 className={`text-4xl font-bold ${isForced ? 'text-yellow-500' : 'text-red-500'}`}>
          {isForced ? "⏰ TIME'S UP — VOTE NOW" : "🚨 EMERGENCY MEETING"}
        </h1>
        <p className="text-white mt-1">
          {isForced
            ? `Round ${currentRound} is over. Final vote!` 
            : `${callerName} called an emergency meeting!`}
        </p>
        {isLastRound && (
          <p className="text-yellow-400 text-sm mt-1">
            ⚠️ This is the final round. If the imposter is not found, they win.
          </p>
        )}
      </div>
      
      {/* Body - two columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left - voting */}
        <div className="flex-[3] overflow-y-auto p-6">
          <div className="bg-gray-900 rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Phase A: Meeting in progress */}
            {!meetingResult && (
              <>
                {/* Voted out banner */}
                {isVotedOut && (
                  <div className="bg-red-900 text-red-200 p-3 rounded mb-4 text-center">
                    You have been voted out. Watch only.
                  </div>
                )}
                
                {/* Error display */}
                {error && (
                  <div className="bg-red-500 text-white p-3 rounded mb-4 text-center">
                    {error}
                  </div>
                )}
                
                {/* Player grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {activePlayers.map(player => (
                    <button
                      key={player.id}
                      onClick={() => castVote(player.id)}
                      disabled={hasVoted || isVotedOut}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        hasVoted || isVotedOut
                          ? 'bg-gray-700 border-gray-600 cursor-not-allowed opacity-50'
                          : 'bg-gray-800 border-gray-600 hover:border-blue-500 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: player.color }}
                        />
                        <span className="text-white font-medium">
                          {player.name}
                          {isOwnPlayer(player.id) && ' (YOU)'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Skip button */}
                <div className="text-center mb-4">
                  <button
                    onClick={() => castVote('skip')}
                    disabled={hasVoted || isVotedOut}
                    className={`px-6 py-3 rounded font-bold transition-colors ${
                      hasVoted || isVotedOut
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    SKIP VOTE
                  </button>
                </div>
                
                {/* Vote progress */}
                <div className="text-center text-white">
                  <div className="text-lg font-medium">
                    {votedCount} / {totalVoters} voted
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 mt-2">
                    <div 
                      className="bg-blue-500 h-3 rounded-full transition-all"
                      style={{ width: `${totalVoters > 0 ? (votedCount / totalVoters) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </>
            )}
            
            {/* Phase B: Result display */}
            {meetingResult && (
              <div className="text-center">
                {meetingResult.type === 'tie' && (
                  <>
                    <h2 className="text-3xl font-bold text-yellow-500 mb-4">NO CONSENSUS</h2>
                    <p className="text-white text-lg">{meetingResult.message}</p>
                  </>
                )}
                
                {meetingResult.type === 'eliminated' && !meetingResult.gameOver && (
                  <>
                    <h2 className="text-3xl font-bold text-orange-500 mb-4">
                      {meetingResult.eliminatedName} has been voted out.
                    </h2>
                    <p className="text-white text-lg">{meetingResult.message}</p>
                  </>
                )}
                
                {meetingResult.type === 'eliminated' && meetingResult.gameOver && (
                  <>
                    <h2 className="text-4xl font-bold text-green-500 mb-4">GAME OVER</h2>
                    <p className="text-white text-xl mb-4">{meetingResult.message}</p>
                    <div className="bg-green-900 text-green-200 p-4 rounded">
                      The imposter was: <span className="font-bold">{meetingResult.eliminatedName}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Right - chat */}
        <div className="flex-[2] border-l border-gray-700">
          <ChatPanel
            socket={socket}
            roomCode={roomCode}
            socketId={socketId}
            isVotedOut={isVotedOut}
          />
        </div>
      </div>
    </div>
  );
};
