import React, { useState, useEffect } from 'react';
import { TopBar } from './TopBar';
import { CodeEditor } from './CodeEditor';
import { ChatPanel } from './ChatPanel';
import EmergencyMeeting from './EmergencyMeeting';
import CivilianWin from './CivilianWin';
import ImposterWin from './ImposterWin';
import CivilianDied from './CivilianDied';
import { GameState, TestCase, ChatMessage } from './types';

interface SabotageCase {
  id: number;
  description: string;
  completed: boolean;
  hint: string;
}

interface ImposterGameRoomProps {
  category: 'SOURCE' | 'README';
  domain: string;
}

const ImposterGameRoom: React.FC<ImposterGameRoomProps> = ({ category, domain }) => {
  // Random player assignment (3-5 players, 1 imposter)
  const [gamePlayers, setGamePlayers] = useState<string[]>(() => {
    const allPlayers = ['You', 'X_Pixel_X', 'GlitchMaster', 'CodeNinja', 'ByteMaster'];
    const playerCount = Math.floor(Math.random() * 3) + 3; // 3-5 players
    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, playerCount);
  });

  const [gameState, setGameState] = useState<GameState>({
    aliveCount: gamePlayers.length - 1, // All players except imposter
    totalPlayers: gamePlayers.length,
    timeLeft: 45,
    topic: domain,
    round: 1,
    totalRounds: 3,
  });

  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: 1, description: "Handle null input", passed: true },
    { id: 2, description: "Check cycle detection", passed: false },
    { id: 3, description: "Verify tail update", passed: true },
    { id: 4, description: "Large list performance", passed: false },
  ]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [showEmergencyMeeting, setShowEmergencyMeeting] = useState(false);
  const [emergencyCaller, setEmergencyCaller] = useState('');
  const [gameEnded, setGameEnded] = useState(false);
  const [gameResult, setGameResult] = useState<'civilian-win' | 'imposter-win' | null>(null);
  const [deadPlayers, setDeadPlayers] = useState<string[]>([]);

  // Check if current user is dead
  const isCurrentUserDead = deadPlayers.includes('You');

  // Random imposter assignment (current user is imposter in ImposterGameRoom)
  const imposterName = 'You';

  // Generate consistent user colors when component mounts
  const [userColors] = useState<Record<string, string>>(() => {
    const colors = [
      'text-blue-500', 'text-pink-500', 'text-red-500', 
      'text-green-500', 'text-orange-500', 'text-purple-500'
    ];
    
    const colorAssignments: Record<string, string> = {};
    gamePlayers.forEach((player, index) => {
      colorAssignments[player] = colors[index % colors.length];
    });
    
    return colorAssignments;
  });

  // Initialize chat messages with consistent colors
  useEffect(() => {
    setMessages([
      { id: '1', user: 'X_Pixel_X', text: 'Anyone figured out the cycle yet?', color: userColors['X_Pixel_X'], timestamp: new Date() },
      { id: '2', user: 'GlitchMaster', text: 'I think it is a Floyd algorithm problem.', color: userColors['GlitchMaster'], timestamp: new Date() },
    ]);
  }, [userColors]);

  const [sabotageCases, setSabotageCases] = useState<SabotageCase[]>([
    { 
      id: 1, 
      description: "Add unnecessary recursive call", 
      completed: false,
      hint: "Increases time complexity to O(2^n)"
    },
    { 
      id: 2, 
      description: "Introduce memory leak", 
      completed: false,
      hint: "Create circular reference"
    },
    { 
      id: 3, 
      description: "Break edge case handling", 
      completed: false,
      hint: "Remove null check"
    },
  ]);

  const [problemZoom, setProblemZoom] = useState(100);

  const handleZoomIn = () => {
    setProblemZoom(prev => Math.min(prev + 10, 150));
  };

  const handleZoomOut = () => {
    setProblemZoom(prev => Math.max(prev - 10, 80));
  };

  // Problem description
  const problemDescription = `Given the head of a linked list, determine if the linked list has a cycle in it.

There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer. Internally, pos is used to denote the index of the node that tail's next pointer is connected to. Note that pos is not passed as a parameter.

Return true if there is a cycle in the linked list. Otherwise, return false.`;

  const constraints = `• The number of the nodes in the list is in the range [0, 10^4].
• -10^5 <= Node.val <= 10^5
• pos is -1 or a valid index in the linked-list.`;

  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        timeLeft: Math.max(0, prev.timeLeft - 1)
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSendMessage = (text: string) => {
    if (text.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        user: 'You',
        text,
        color: userColors['You'],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
    }
  };

  // Check for emergency meeting or timer end
  useEffect(() => {
    if (gameState.timeLeft === 0 && !showEmergencyMeeting) {
      setEmergencyCaller('Timer');
      setShowEmergencyMeeting(true);
    }
  }, [gameState.timeLeft, showEmergencyMeeting]);

  const handleEmergency = () => {
    setEmergencyCaller('You');
    setShowEmergencyMeeting(true);
  };

  const handleVote = (votedPlayer: string) => {
    console.log('Vote for:', votedPlayer);
    // Handle voting logic here
  };

  const handleSkipVote = () => {
    console.log('Vote skipped');
    // Handle skip logic here
  };

  const handleMeetingEnd = () => {
    setShowEmergencyMeeting(false);
    // Reset timer for next round
    setGameState(prev => ({
      ...prev,
      timeLeft: 45,
      round: prev.round + 1
    }));
  };

  const handleGameEnd = (result: 'civilian-win' | 'imposter-win') => {
    setGameResult(result);
    setGameEnded(true);
  };

  const handlePlayAgain = () => {
    // Navigate to home page - reload the application
    window.location.href = '/';
  };

  const handleCivilianDied = (deadPlayer: string) => {
    setDeadPlayers(prev => [...prev, deadPlayer]);
    setShowEmergencyMeeting(false);
    // Update alive count in game state
    setGameState(prev => ({
      ...prev,
      aliveCount: Math.max(0, prev.aliveCount - 1),
      timeLeft: 45,
      round: prev.round + 1
    }));
  };

  // Get alive players (excluding dead ones)
  const getAlivePlayers = () => {
    return gamePlayers.filter(player => !deadPlayers.includes(player));
  };

  const handleRunCode = () => {
    // Imposter's code run - make it look like they're trying but failing
    setTestCases(prev => prev.map(tc => ({
      ...tc,
      passed: tc.id === 1 ? false : tc.passed // Make the first test fail
    })));
  };

  if (showEmergencyMeeting) {
    return (
      <EmergencyMeeting
        players={getAlivePlayers()}
        currentUser="You"
        onVote={handleVote}
        onSkip={handleSkipVote}
        onMeetingEnd={handleMeetingEnd}
        gameState={gameState}
        calledBy={emergencyCaller}
        userColors={userColors}
        onGameEnd={handleGameEnd}
        onCivilianDied={handleCivilianDied}
        imposterName={imposterName}
        alivePlayers={getAlivePlayers()}
      />
    );
  }

  // Show game ending screen if game has ended
  if (gameEnded) {
    if (gameResult === 'civilian-win') {
      return (
        <CivilianWin 
          imposterName={imposterName}
          onPlayAgain={handlePlayAgain}
        />
      );
    }
    
    if (gameResult === 'imposter-win') {
      return (
        <ImposterWin 
          imposterName={imposterName}
          onPlayAgain={handlePlayAgain}
        />
      );
    }

    if (gameResult === 'civilian-died') {
      return (
        <CivilianDied 
          imposterName={imposterName}
          onPlayAgain={handlePlayAgain}
        />
      );
    }
  }

  const handleSabotageComplete = (caseId: number) => {
    setSabotageCases(prev => prev.map(sc => 
      sc.id === caseId ? { ...sc, completed: true } : sc
    ));
  };

  return (
    <div className="h-screen w-screen overflow-hidden grid grid-rows-[auto_1fr] grid-cols-[280px_1fr_320px] bg-[#121212] text-white fixed inset-0">
      {/* Row 1: Top Bar */}
      <div className="col-span-3">
        <TopBar state={gameState} />
      </div>

      {/* Row 2, Column 1: Imposter Sabotage Panel */}
      <div className="border-r-4 border-black bg-[#2d2d2d] flex flex-col">
        {/* Problem Description */}
        <div className="p-4 border-b-4 border-black">
          <div className="flex items-center justify-between mb-2">
            <h2 className="bg-black text-white px-2 py-1 text-sm font-['Press_Start_2P']">PROBLEM</h2>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleZoomOut}
                disabled={problemZoom <= 80}
                className="px-2 py-1 bg-gray-700 text-white text-xs border-2 border-black hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                -
              </button>
              <span className="text-xs text-white font-mono">{problemZoom}%</span>
              <button 
                onClick={handleZoomIn}
                disabled={problemZoom >= 150}
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
              {problemDescription}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="text-yellow-400 font-['Press_Start_2P'] text-xs mb-1">CONSTRAINTS:</div>
              <div 
                className="text-gray-400 text-xs font-mono whitespace-pre-wrap transition-all duration-200" 
                style={{ fontSize: `${problemZoom}%` }}
              >
                {constraints}
              </div>
            </div>
          </div>
        </div>

        {/* Sabotage Cases */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="bg-red-600 text-white px-2 py-1 mb-3 text-sm font-['Press_Start_2P']">SABOTAGE CASES</h2>
          <ul className="space-y-3">
            {sabotageCases.map((sc) => (
              <li 
                key={sc.id} 
                className={`flex items-start p-2 bg-[#252525] border-2 border-black ${
                  sc.completed ? 'text-[#ff0000]' : 'text-gray-400'
                }`}
              >
                <span className="mr-2">{sc.completed ? '☑' : '☐'}</span>
                <span className={`text-sm ${sc.completed ? 'strikethrough-pixel' : ''}`}>
                  {sc.description}
                </span>
              </li>
            ))}
          </ul>

          {/* Common Test Cases */}
          <div className="mt-6">
            <h2 className="bg-black text-white px-2 py-1 mb-3 text-sm font-['Press_Start_2P']">TEAM PROGRESS</h2>
            <ul className="space-y-2">
              {testCases.map((tc) => (
                <li 
                  key={tc.id} 
                  className={`flex items-start p-2 bg-[#252525] border-2 border-black ${tc.passed ? 'text-[#00ff00]' : 'text-gray-400'}`}
                >
                  <span className="mr-2">{tc.passed ? '☑' : '☐'}</span>
                  <span className={tc.passed ? 'strikethrough-pixel' : ''}>
                    {tc.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Emergency Button */}
        <div className="p-4 bg-[#3d3d3d] border-t-4 border-black">
          <button 
            onClick={handleEmergency}
            className="w-full bg-[#ff0000] border-4 border-black border-b-8 border-r-8 active:border-b-4 active:border-r-4 active:translate-y-1 active:translate-x-1 py-4 text-white font-['Press_Start_2P'] text-xs leading-tight transition-all hover:bg-red-600"
          >
            🚨 EMERGENCY<br/>MEET
          </button>
        </div>
      </div>

      {/* Row 2, Column 2: Center Code Area */}
      <div className="bg-[#1a1a1a] p-4 flex flex-col relative overflow-hidden">
        {isCurrentUserDead ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-center">
            <div>
              <div className="text-2xl mb-2">💀</div>
              <div className="text-lg font-pixel">YOU ARE DEAD</div>
              <div className="text-sm mt-2">You can only chat now</div>
            </div>
          </div>
        ) : (
          <CodeEditor onRun={handleRunCode} />
        )}
      </div>

      {/* Row 2, Column 3: Right Chat Area */}
      <div className="border-l-4 border-black bg-[#2d2d2d] flex flex-col">
        <ChatPanel 
          messages={messages} 
          onSendMessage={handleSendMessage} 
        />
      </div>
    </div>
  );
};

export default ImposterGameRoom;
