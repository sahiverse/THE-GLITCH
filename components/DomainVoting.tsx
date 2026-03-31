import React, { useState, useEffect } from 'react';
import RetroButton from './RetroButton';

interface DomainVotingProps {
  onConfirm: (domain: string) => void;
  socket: any;
  inviteCode: string;
  availableTopics?: string[];
  voteData?: any;
}

const DomainVoting: React.FC<DomainVotingProps> = ({ onConfirm, socket, inviteCode, availableTopics, voteData }) => {
  const [timeLeft, setTimeLeft] = useState(10);
  const [selection, setSelection] = useState<string | null>(null);
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [winningTopic, setWinningTopic] = useState<string | null>(null);
  
  // Use backend topics if provided, otherwise fallback to hardcoded list
  const TOPICS = availableTopics || [
    "Arrays",
    "Strings", 
    "Linked Lists",
    "Stacks & Queues",
    "Binary Search",
    "Recursion",
    "Sorting",
    "Hashing",
    "Trees",
    "Graphs",
    "Dynamic Programming",
    "Sliding Window"
  ];

  useEffect(() => {
    // Trigger button animations after component mounts
    const timer = setTimeout(() => {
      setButtonsVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      // Auto-vote if no selection made
      if (!hasVoted && !winningTopic) {
        const autoTopic = selection || TOPICS[Math.floor(Math.random() * TOPICS.length)];
        handleVote(autoTopic);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, selection, hasVoted, winningTopic]);

  const handleVote = (topic: string) => {
    if (hasVoted || winningTopic) return;
    
    console.log('🗳️ Casting vote for:', topic);
    socket?.emit('cast_vote', {
      code: inviteCode,
      topic: topic
    });
    
    setHasVoted(true);
    setSelection(topic);
  };

  const handleTopicSelect = (topic: string) => {
    if (hasVoted || winningTopic) return;
    setSelection(topic);
  };

  const getVoteCount = (topic: string) => {
    return voteData?.votes?.[topic] || 0;
  };

  const getVotePercentage = (topic: string) => {
    if (!voteData?.totalPlayers) return 0;
    const count = getVoteCount(topic);
    return Math.round((count / voteData.totalPlayers) * 100);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl animate-in fade-in zoom-in duration-500 px-4 py-16 min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl text-retro-white drop-shadow-[6px_6px_0px_#000] uppercase mb-4 font-pixel tracking-tighter">
          VOTE FOR A TOPIC
        </h1>
        <div className="bg-retro-black text-retro-white px-6 py-2 inline-block border-4 border-white shadow-[6px_6px_0_0_#000]">
          <span className="font-pixel text-xl md:text-2xl tracking-widest text-retro-yellow">
            {timeLeft < 10 ? `0${timeLeft}` : timeLeft}S
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mb-8">
        {TOPICS.map((topic, index) => (
          <div
            key={topic}
            className="transition-all duration-700 ease-out"
            style={{
              transform: buttonsVisible 
                ? 'translateX(0)' 
                : index % 2 === 0 
                  ? 'translateX(-32px)' 
                  : 'translateX(32px)',
              opacity: buttonsVisible ? 1 : 0,
              transitionDelay: buttonsVisible ? `${index * 50}ms` : '0ms'
            }}
          >
            <RetroButton
              variant={selection === topic ? "primary" : "orange"}
              onClick={() => handleTopicSelect(topic)}
              disabled={hasVoted || winningTopic !== null}
              className={`w-full !py-4 !px-5 !text-xs flex items-center justify-center text-center leading-relaxed ${
                selection === topic ? 'scale-105 z-10 ring-4 ring-white shadow-xl' : 'opacity-90 hover:opacity-100'
              } ${winningTopic === topic ? 'ring-4 ring-green-400' : ''}`}
            >
              <div className="flex flex-col items-center">
                <span className="block mb-1 text-[8px] opacity-70">
                  {winningTopic === topic ? '🏆 WINNER' : selection === topic ? '● SELECTED ●' : ''}
                </span>
                {topic}
              </div>
            </RetroButton>
          </div>
        ))}
      </div>

      <div className="mt-8 w-full max-w-md">
        <RetroButton 
          variant="success" 
          className="w-full py-6 text-2xl shadow-[0_0_40px_rgba(85,160,57,0.4)]"
          onClick={() => selection && !hasVoted && handleVote(selection)}
          disabled={hasVoted || !selection || winningTopic !== null}
        >
          {hasVoted ? 'VOTED!' : 'CAST VOTE'}
        </RetroButton>
      </div>

      <div className="mt-8 mb-8 text-center">
        <p className="font-pixel text-[10px] text-retro-black/60 uppercase tracking-widest animate-pulse">
          If you don't choose, the arena will choose for you.
        </p>
        {voteData && (
          <p className="font-pixel text-[8px] text-retro-black/50 uppercase mt-2">
            {voteData.votedCount || 0} / {voteData.totalPlayers || 0} players voted
          </p>
        )}
        {winningTopic && (
          <div className="mt-4 animate-in fade-in zoom-in duration-500">
            <p className="font-pixel text-lg text-retro-green uppercase animate-bounce">
              🏆 WINNING TOPIC: {winningTopic}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DomainVoting;