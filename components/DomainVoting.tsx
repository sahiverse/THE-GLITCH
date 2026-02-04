import React, { useState, useEffect } from 'react';
import RetroButton from './RetroButton';

interface DomainVotingProps {
  onConfirm: (domain: string) => void;
}

const DOMAINS = [
  "Arrays & Hashing",
  "Two Pointers",
  "Sliding Window",
  "Stack",
  "Binary Search",
  "Linked List",
  "Trees",
  "Heap / Priority Queue",
  "Backtracking",
  "Graphs",
  "Tries",
  "Bit Manipulation",
  "Dynamic Programming"
];

const DomainVoting: React.FC<DomainVotingProps> = ({ onConfirm }) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const [selection, setSelection] = useState<string | null>(null);
  const [buttonsVisible, setButtonsVisible] = useState(false);

  useEffect(() => {
    // Trigger button animations after component mounts
    const timer = setTimeout(() => {
      setButtonsVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      onConfirm(selection || DOMAINS[Math.floor(Math.random() * DOMAINS.length)]);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onConfirm, selection]);

  return (
    <div className="flex flex-col items-center w-full max-w-5xl animate-in fade-in zoom-in duration-500 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl text-retro-white drop-shadow-[6px_6px_0px_#000] uppercase mb-4 font-pixel tracking-tighter">
          VOTE FOR A TOPIC
        </h1>
        <div className="bg-retro-black text-retro-white px-8 py-3 inline-block border-4 border-white shadow-[6px_6px_0_0_#000]">
          <span className="font-pixel text-2xl md:text-3xl tracking-widest text-retro-yellow">
            {timeLeft < 10 ? `0${timeLeft}` : timeLeft}S
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
        {DOMAINS.map((domain, index) => (
          <div
            key={domain}
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
              variant={selection === domain ? "primary" : "orange"}
              onClick={() => setSelection(domain)}
              className={`w-full !py-3 !px-4 !text-xs md:!text-sm flex items-center justify-center text-center leading-relaxed ${
                selection === domain ? 'scale-105 z-10 ring-4 ring-white shadow-xl' : 'opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex flex-col items-center">
                <span className="block mb-1 text-[8px] opacity-70">
                  {selection === domain ? '● SELECTED ●' : ''}
                </span>
                {domain}
              </div>
            </RetroButton>
          </div>
        ))}
      </div>

      <div className="mt-12 w-full max-w-md">
        <RetroButton 
          variant="success" 
          className="w-full py-6 text-2xl shadow-[0_0_40px_rgba(85,160,57,0.4)]"
          onClick={() => selection && onConfirm(selection)}
          disabled={!selection}
        >
          CAST VOTE
        </RetroButton>
      </div>

      <p className="mt-8 font-pixel text-[10px] text-retro-black/60 uppercase tracking-widest text-center animate-pulse">
        WAITING FOR THE OTHER PLAYERS...
      </p>
    </div>
  );
};

export default DomainVoting;