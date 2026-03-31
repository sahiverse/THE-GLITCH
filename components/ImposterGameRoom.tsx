import React, { useState, useEffect } from 'react';
import { TopBar } from './TopBar';
import CollaborativeEditor from './CollaborativeEditor';
import { ChatPanel } from './ChatPanel';
import EmergencyMeeting from './EmergencyMeeting';
import { GameState } from './types';

interface SabotageCase {
  id: number;
  description: string;
  completed: boolean;
  hint: string;
}

interface ImposterGameRoomProps {
  category: 'SOURCE' | 'README';
  domain: string;
  socket: any;
  socketId: string;
  roomCode: string;
  players: any[];
  yourPlayer: any;
  question: string;
  sabotageTestCases: any[];
  testCases: any[];
  outputResults?: any[] | null;
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  lockedPlayers: string[];
  roomData?: any;
  language: string;
  meetingsLeft: number;
  maxPlayers: number;
  pendingMeeting?: { callerName: string; isForced: boolean } | null;
  onGameOver: (data: any) => void;
}

const ImposterGameRoom: React.FC<ImposterGameRoomProps> = ({ 
  category, 
  domain, 
  socket, 
  socketId, 
  roomCode, 
  players, 
  yourPlayer, 
  question, 
  sabotageTestCases,
  testCases,
  outputResults,
  currentRound, 
  totalRounds, 
  timeLeft, 
  lockedPlayers, 
  roomData,
  language,
  meetingsLeft,
  maxPlayers,
  pendingMeeting,
  onGameOver 
}) => {
  console.log('🔤 ImposterGameRoom rendered with language:', language, 'socketId:', socketId);
  // Check if current player is host (first player in room or has isHost flag)
  const isHost = yourPlayer?.isHost || players[0]?.id === yourPlayer?.id;
  console.log('🎮 ImposterGameRoom - yourPlayer:', yourPlayer, 'isHost:', isHost, 'players[0]:', players[0]);
  
  // Meeting state
  const [meetingActive, setMeetingActive] = useState(!!pendingMeeting);
  const [meetingCallerName, setMeetingCallerName] = useState(pendingMeeting?.callerName || '');
  const [isForced, setIsForced] = useState(pendingMeeting?.isForced || false);
  
  // Sync pendingMeeting prop into local state (useState initial value only works on mount)
  useEffect(() => {
    if (pendingMeeting) {
      setMeetingActive(true);
      setMeetingCallerName(pendingMeeting.callerName);
      setIsForced(pendingMeeting.isForced);
    }
  }, [pendingMeeting]);
  
  // Run/Submit state
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [runResults, setRunResults] = useState<any[] | null>(null)
  const [sharedRealStatus, setSharedRealStatus] = useState<any[] | null>(null);
  const [sharedSabotageStatus, setSharedSabotageStatus] = useState<any[] | null>(null);
  const [outputError, setOutputError] = useState<string | null>(null)
  const [submittingPlayerName, setSubmittingPlayerName] = useState<string | null>(null)
  const [submittingPlayerColor, setSubmittingPlayerColor] = useState<string | null>(null)
  const [submitSummary, setSubmitSummary] = useState<{
    totalPassed: number;
    totalFailed: number;
    totalCases: number;
  } | null>(null)
  
  // meetingsLeft comes from App.tsx as a prop — always up to date
  
  // Computed game state for TopBar (no useState needed)
  const aliveCount = players.length - (lockedPlayers?.length || 0);
  


  const gameStateForTopBar: GameState = {
    aliveCount: aliveCount,
    totalPlayers: maxPlayers,     // use maxPlayers not players.length
    maxPlayers: maxPlayers,       // add maxPlayers field
    timeLeft: timeLeft,
    topic: domain,
    round: currentRound,
    totalRounds: totalRounds,
    meetingsLeft: meetingsLeft,   // from props
  };

  const [problemZoom, setProblemZoom] = useState(100);

  const handleZoomIn = () => {
    setProblemZoom(prev => Math.min(prev + 10, 150));
  };

  const handleZoomOut = () => {
    setProblemZoom(prev => Math.max(prev - 10, 80));
  };

  // Meeting socket listeners
  useEffect(() => {
    if (!socket) return

    const handleMeetingStarted = (data: any) => {
      console.log('🚨 Meeting started received:', data.callerName, 'meetingsLeft:', data.meetingsLeft)
      setMeetingActive(true)
      setMeetingCallerName(data.callerName)
      setIsForced(data.isForced || false)
    }

    const handleGameOver = (data: any) => {
      onGameOver(data)
    }

    // Run/Submit listeners
    const handleRunStarted = () => {
      setIsRunning(true)
      setRunResults(null)
      setOutputError(null)
      setSubmitSummary(null)
    }
    const handleRunResult = (data: any) => {
      setIsRunning(false)
      setRunResults(data.results)
    }
    const handleRunStatusUpdate = (data: any) => {
      setSharedRealStatus(data.realResults);
      setSharedSabotageStatus(data.sabotageResults);
    }
    const handleRunError = (data: any) => {
      setIsRunning(false)
      setRunResults(null)
      setOutputError(data.error)
    }
    const handleSubmitStarted = (data: any) => {
      setIsSubmitting(true)
      setSubmittingPlayerName(data.submittedBy)
      setSubmittingPlayerColor(data.submittedByColor)
      setRunResults(null)
      setSubmitSummary(null)
    }
    const handleSubmitResult = (data: any) => {
      setIsSubmitting(false)
      setRunResults(data.results)
      setSubmitSummary({
        totalPassed: data.totalPassed,
        totalFailed: data.totalFailed,
        totalCases: data.totalCases
      })
    }
    const handleSubmissionBroadcast = (data: any) => {
      setIsSubmitting(false)
      setSubmittingPlayerName(null)
      setSubmittingPlayerColor(null)
    }
    const handleSubmitError = (data: any) => {
      setIsSubmitting(false)
      setOutputError(data.error)
    }

    socket.on('meeting_started', handleMeetingStarted)
    socket.on('game_over', handleGameOver)
    socket.on('run_started', handleRunStarted)
    socket.on('run_result', handleRunResult)
    socket.on('run_status_update', handleRunStatusUpdate)
    socket.on('run_error', handleRunError)
    socket.on('submit_started', handleSubmitStarted)
    socket.on('submit_result', handleSubmitResult)
    socket.on('submission_broadcast', handleSubmissionBroadcast)
    socket.on('submit_error', handleSubmitError)

    return () => {
      socket.off('meeting_started', handleMeetingStarted)
      socket.off('game_over', handleGameOver)
      socket.off('run_started', handleRunStarted)
      socket.off('run_result', handleRunResult)
      socket.off('run_status_update', handleRunStatusUpdate)
      socket.off('run_error', handleRunError)
      socket.off('submit_started', handleSubmitStarted)
      socket.off('submit_result', handleSubmitResult)
      socket.off('submission_broadcast', handleSubmissionBroadcast)
      socket.off('submit_error', handleSubmitError)
    }
  }, [socket, onGameOver])

  const handleLanguageChange = (language: string) => {
    console.log('🔤 ImposterGameRoom handleLanguageChange called with:', language);
    console.log('🔤 ImposterGameRoom socket exists:', !!socket);
    console.log('🔤 ImposterGameRoom roomCode:', roomCode);
    
    // Broadcast language change to all players
    const emitData = {
      code: roomCode,
      language: language
    };
    console.log('🔤 ImposterGameRoom emitting language_change with data:', emitData);
    
    socket?.emit('language_change', emitData);
  };

  const handleRun = () => {
    if (isRunning || isSubmitting) return
    setIsRunning(true)
    setRunResults(null)
    setOutputError(null)
    socket?.emit('run_code', { language })
  }

  const handleSubmit = () => {
    if (isRunning || isSubmitting) return
    setIsSubmitting(true)
    setRunResults(null)
    setOutputError(null)
    socket?.emit('submit_code', { language })
  }

  const onMeetingEnd = () => {
    console.log('onMeetingEnd called in ImposterGameRoom')
    setMeetingActive(false)
  };

  return (
    <>
      {/* Emergency Meeting OVERLAY — rendered on top, game room stays mounted underneath */}
      {meetingActive && (
        <div className="fixed inset-0 z-50">
          <EmergencyMeeting
            socket={socket}
            socketId={socketId}
            roomCode={roomCode}
            players={players}
            lockedPlayers={lockedPlayers}
            isVotedOut={lockedPlayers.includes(socketId)}
            callerName={meetingCallerName}
            isForced={isForced}
            onMeetingEnd={() => setMeetingActive(false)}
            onGameOver={onGameOver}
          />
        </div>
      )}

      {/* Game Room — always mounted, never unmounts */}
      <div className="h-screen w-screen overflow-hidden grid grid-rows-[auto_1fr] grid-cols-[280px_1fr_320px] bg-[#121212] text-white fixed inset-0">
      {/* Row 1: Top Bar */}
      <div className="col-span-3">
        <TopBar state={gameStateForTopBar} />
      </div>

      {/* Row 2, Column 1: Imposter Sabotage Panel */}
      <div className="border-r-4 border-black bg-[#2d2d2d] flex flex-col overflow-hidden">
        {lockedPlayers.includes(socketId) && (
          <div className="bg-red-900 border-b-4 border-black p-2 text-center">
            <span className="text-red-300 font-['Press_Start_2P'] text-[8px]">
              💀 YOU ARE DEAD — SPECTATING
            </span>
          </div>
        )}
        {/* Problem Description */}
        <div className="p-4 border-b-4 border-black">
          <div className="flex items-center justify-between mb-2">
            <h2 className="bg-black text-white px-2 py-1 text-sm font-['Press_Start_2P']">MISSION BRIEF</h2>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleZoomOut}
                disabled={problemZoom <= 80 || lockedPlayers.includes(socketId)}
                className="px-2 py-1 bg-gray-700 text-white text-xs border-2 border-black hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                -
              </button>
              <span className="text-xs text-white font-mono">{problemZoom}%</span>
              <button 
                onClick={handleZoomIn}
                disabled={problemZoom >= 150 || lockedPlayers.includes(socketId)}
                className="px-2 py-1 bg-gray-700 text-white text-xs border-2 border-black hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          </div>
          <div className="bg-[#1a1a1a] p-3 border-2 border-black text-gray-300 leading-relaxed text-xs max-h-48 overflow-y-auto">
            <div 
              className="whitespace-pre-wrap font-mono transition-all duration-200" 
              style={{ fontSize: `${problemZoom}%` }}
            >
              {question || 'Loading mission brief...'}
            </div>
          </div>
        </div>

        {/* Sabotage Cases */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <h2 className="bg-red-600 text-white px-2 py-1 mb-3 text-sm font-['Press_Start_2P']">SABOTAGE CASES</h2>
          <ul className="space-y-3">
            {sabotageTestCases.length === 0 ? (
              <li className="text-gray-500 text-xs font-mono">
                No sabotage cases loaded.
              </li>
            ) : (
              sabotageTestCases.map((tc, index) => {
                // Match against sharedSabotageStatus (broadcast) or runResults (local)
                const result = sharedSabotageStatus?.find((r: any) => r.input === tc.input)
                            ?? runResults?.find((r: any) => r.input === tc.input);
                const passed = result?.passed ?? false;
                const hasResult = result !== undefined && result !== null;

                return (
                  <li
                    key={index}
                    className={`p-2 bg-[#252525] border-2 border-black ${
                      hasResult
                        ? passed
                          ? 'border-[#00ff00] text-[#00ff00]'
                          : 'border-red-500 text-red-400'
                        : 'text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{hasResult ? (passed ? '☑' : '☒') : '☐'}</span>
                      <span className="text-gray-300 font-bold">
                        Sabotage {index + 1}
                      </span>
                      {hasResult && (
                        <span className={passed ? 'text-[#00ff00]' : 'text-red-400'}>
                          {passed ? 'SABOTAGED ✓' : 'NOT YET'}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500 text-[10px] truncate">
                      Input: {tc.input?.replace(/\n/g, ' | ').slice(0, 60)}{tc.input?.length > 60 ? '...' : ''}
                    </div>
                    <div className="text-gray-500 text-[10px] truncate">
                      Expected: {tc.expectedOutput}
                    </div>
                    {hasResult && !passed && result.actualOutput && (
                      <div className="text-red-400 text-[10px] truncate mt-1">
                        Got: {result.actualOutput}
                      </div>
                    )}
                    {hasResult && !passed && result.stderr && (
                      <div className="text-orange-400 text-[10px] truncate mt-1">
                        Error: {result.stderr}
                      </div>
                    )}
                  </li>
                );
              })
            )}
          </ul>

        {/* Team Progress */}
        <div className="mt-6">
          <h2 className="bg-black text-white px-2 py-1 mb-3 text-sm font-['Press_Start_2P']">TEAM PROGRESS</h2>
          <ul className="space-y-3">
            {testCases.length === 0 ? (
              <li className="text-gray-500 text-xs font-mono">
                No team progress data available.
              </li>
            ) : (
              testCases.slice(0, 4).map((tc, index) => {
              // Match against sharedRealStatus (broadcast) or runResults (local)
              const result = sharedRealStatus?.find((r: any) => r.input === tc.input)
                          ?? runResults?.find((r: any) => r.input === tc.input);
              const passed = result?.passed ?? false;
              const hasResult = result !== undefined && result !== null;

              return (
                <li
                  key={index}
                  className={`p-2 bg-[#252525] border-2 border-black ${
                    hasResult
                      ? passed
                        ? 'border-[#00ff00] text-[#00ff00]'
                        : 'border-red-500 text-red-400'
                      : 'text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{hasResult ? (passed ? '☑' : '☒') : '☐'}</span>
                    <span className="text-gray-300 font-bold">Case {index + 1}</span>
                    {hasResult && (
                      <span className={passed ? 'text-[#00ff00]' : 'text-red-400'}>
                        {passed ? 'PASSED' : 'FAILED'}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500 text-[10px] truncate">
                    Input: {tc.input?.replace(/\n/g, ' | ')}
                  </div>
                  <div className="text-gray-500 text-[10px] truncate">
                    Expected: {tc.expectedOutput}
                  </div>
                  {hasResult && !passed && result.actualOutput && (
                    <div className="text-red-400 text-[10px] truncate mt-1">
                      Got: {result.actualOutput}
                    </div>
                  )}
                  {hasResult && !passed && result.stderr && (
                    <div className="text-orange-400 text-[10px] truncate mt-1">
                      Error: {result.stderr}
                    </div>
                  )}
                </li>
              );
            })
            )}
          </ul>
        </div>
        </div>

        {/* Emergency Button */}
        <div className="p-4 bg-[#3d3d3d] border-t-4 border-black">
          <button 
            onClick={() => {
              if (meetingsLeft > 0 && !lockedPlayers.includes(socketId)) {
                socket?.emit('emergency_meeting', {})
              }
            }}
            disabled={meetingsLeft <= 0 || lockedPlayers.includes(socketId)}
            className="w-full bg-[#ff0000] border-4 border-black border-b-8 border-r-8 active:border-b-4 active:border-r-4 active:translate-y-1 active:translate-x-1 py-4 text-white font-['Press_Start_2P'] text-xs leading-tight transition-all hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚨 EMERGENCY<br/>MEET
            <div className="text-[8px] mt-1 opacity-70">({meetingsLeft} left)</div>
          </button>
        </div>
      </div>

      {/* Row 2, Column 2: Center Code Area */}
      <div className="bg-[#1a1a1a] flex flex-col overflow-hidden">
        <CollaborativeEditor
          roomCode={roomCode}
          language={language}
          initialCode={`# ${domain} Problem\n\n`}
          socket={socket}
          socketId={socketId}
          lockedPlayers={lockedPlayers}
          isHost={isHost}
          onLanguageChange={handleLanguageChange}
          onRun={handleRun}
          onSubmit={handleSubmit}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          outputResults={runResults}
          outputError={outputError}
          submittingPlayerName={submittingPlayerName}
          submittingPlayerColor={submittingPlayerColor}
          submitSummary={submitSummary}
        />
      </div>

      {/* Row 2, Column 3: Right Chat Area */}
      <div className="border-l-4 border-black bg-[#2d2d2d] flex flex-col">
        <ChatPanel
          socket={socket}
          roomCode={roomCode}
          socketId={socketId}
          isVotedOut={false}
        />
      </div>
    </div>
    </>
  );
};

export default ImposterGameRoom;
