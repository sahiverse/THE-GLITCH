import { useState, useEffect, useCallback } from 'react';

interface PlayerObject {
  id: string;
  name: string;
  color: string;
  role: string | null;
  isReady: boolean;
}

interface MeetingResult {
  type: 'tie' | 'eliminated';
  eliminatedId?: string;
  eliminatedName?: string;
  gameOver: boolean;
  winner?: string;
  message: string;
}

interface UseMeetingProps {
  socket: any;
  roomCode: string;
  socketId: string;
  isVotedOut: boolean;
  onGameOver?: (data: any) => void;
}

export const useMeeting = ({ socket, roomCode, socketId, isVotedOut, onGameOver }: UseMeetingProps) => {
  const [meetingActive, setMeetingActive] = useState<boolean>(false);
  const [callerName, setCallerName] = useState<string>('');
  const [players, setPlayers] = useState<PlayerObject[]>([]);
  const [lockedPlayers, setLockedPlayers] = useState<string[]>([]);
  const [votedCount, setVotedCount] = useState<number>(0);
  const [totalVoters, setTotalVoters] = useState<number>(0);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [meetingResult, setMeetingResult] = useState<MeetingResult | null>(null);
  const [meetingsLeft, setMeetingsLeft] = useState<number>(1);
  const [isForced, setIsForced] = useState<boolean>(false);
  const [isLastRound, setIsLastRound] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Listen for meeting started
  useEffect(() => {
    if (!socket) return;
    
    const handleMeetingStarted = (data: any) => {
      console.log('🚨 Meeting started:', data);
      setMeetingActive(true);
      setCallerName(data.callerName);
      setPlayers(data.players);
      setLockedPlayers(data.lockedPlayers || []);
      setMeetingsLeft(data.meetingsLeft[socketId] ?? 0);
      setHasVoted(false);
      setVotedCount(0);
      setMeetingResult(null);
      setIsForced(data.isForced || false);
      setIsLastRound(data.isLastRound || false);
    };
    
    const handleVoteUpdate = (data: any) => {
      console.log('🗳️ Vote update:', data);
      setVotedCount(data.votedCount);
      setTotalVoters(data.totalVoters);
    };
    
    const handleMeetingResult = (data: any) => {
      console.log('🏁 Meeting result:', data);
      setMeetingResult(data.outcome);
      setLockedPlayers(data.lockedPlayers);
      
      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        if (data.outcome.gameOver) {
          onGameOver?.(data);
        } else {
          setMeetingActive(false);
          setHasVoted(false);
          setMeetingResult(null);
        }
      }, 4000);
    };
    
    const handleMeetingError = (data: { error: string }) => {
      console.error('❌ Meeting error:', data);
      setError(data.error);
      setTimeout(() => setError(''), 3000);
    };
    
    socket.on('meeting_started', handleMeetingStarted);
    socket.on('vote_update', handleVoteUpdate);
    socket.on('meeting_result', handleMeetingResult);
    socket.on('meeting_error', handleMeetingError);
    
    return () => {
      socket.off('meeting_started', handleMeetingStarted);
      socket.off('vote_update', handleVoteUpdate);
      socket.off('meeting_result', handleMeetingResult);
      socket.off('meeting_error', handleMeetingError);
    };
  }, [socket, socketId, onGameOver]);
  
  // Call emergency meeting
  const callMeeting = useCallback(() => {
    if (!socket || !roomCode) return;
    
    if (isVotedOut) {
      setError('Voted out players cannot call meetings');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (meetingsLeft <= 0) {
      setError('No meetings left');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    socket.emit('emergency_meeting', {});
    console.log('🚨 Calling emergency meeting');
  }, [socket, roomCode, isVotedOut, meetingsLeft]);
  
  // Cast vote
  const castVote = useCallback((targetId: string) => {
    if (!socket || !roomCode) return;
    
    if (hasVoted) return;
    if (isVotedOut) return;
    
    setHasVoted(true); // Optimistic
    socket.emit('cast_meeting_vote', { targetId });
    console.log('🗳️ Casting vote:', targetId);
  }, [socket, roomCode, hasVoted, isVotedOut]);
  
  return {
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
  };
};
