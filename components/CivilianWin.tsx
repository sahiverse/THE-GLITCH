import React, { useState, useEffect } from 'react';
import RetroButton from './RetroButton';
import FloatingAssets from './FloatingAssets';

enum RevealStatus {
  IDLE = 'IDLE',
  REVEALING = 'REVEALING',
  COMPLETE = 'COMPLETE',
}

interface CivilianWinProps {
  imposterName: string;
  onPlayAgain: () => void;
}

const CivilianWin: React.FC<CivilianWinProps> = ({ imposterName, onPlayAgain }) => {
  const [status, setStatus] = useState<RevealStatus>(RevealStatus.IDLE);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(false);
  const imageUrl = '/coin2.jpg';

  // Debug: Log the imposterName value
  console.log('CivilianWin - imposterName:', imposterName);

  useEffect(() => {
    // Auto-start the reveal when component mounts
    const timer = setTimeout(() => {
      setStatus(RevealStatus.REVEALING);
      
      // Show subtitle after animation
      setTimeout(() => {
        setSubtitleVisible(true);
        setStatus(RevealStatus.COMPLETE);
        
        // Show play again button
        setTimeout(() => {
          setButtonVisible(true);
        }, 1000);
      }, 1500);
    }, 500); // 500ms delay before starting

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative h-screen w-screen bg-retro-sky flex flex-col items-center justify-center overflow-hidden">
      {/* Floating Assets Background */}
      <FloatingAssets />
      
      {/* Main Container */}
      <div className="relative flex flex-col items-center justify-center gap-10 px-10 z-10">
        
        {/* The Reveal Wrapper */}
        <div className="relative flex items-center justify-center min-w-[300px]">
          
          {/* The "CIVILIANS WON!" Text - Masked Reveal */}
          <h1 
            className={`
              pixel-font text-green-500 text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-widest text-center select-none drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]
              transition-all duration-[1500ms] ease-linear
              ${status === RevealStatus.IDLE ? 'clip-hide opacity-0' : 'clip-show opacity-100'}
            `}
            style={{
                clipPath: status === RevealStatus.IDLE 
                    ? 'inset(0 100% 0 0)' 
                    : 'inset(0 0 0 0)'
            }}
          >
            civilians won!
          </h1>

          {/* The Rolling Cover Image - Rolls across text to end at "!" */}
          <div 
            className={`
              absolute z-20 transition-all duration-[1500ms] ease-linear pointer-events-none
              ${status !== RevealStatus.IDLE 
                ? 'translate-x-[500px] rotate-[720deg]' 
                : '-translate-x-[500px] rotate-0'}
            `}
          >
            <img 
              src={imageUrl} 
              alt="Secret" 
              className="w-20 h-20 md:w-28 md:h-28 object-contain drop-shadow-2xl select-none"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>

        {/* The Subtitle - Appears after "civilians won!" reveal */}
        <div className="h-12 flex items-center justify-center mt-4">
            <p className={`
              pixel-font text-white text-[14px] md:text-[18px] max-w-xs md:max-w-md text-center leading-relaxed tracking-tighter uppercase select-none drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]
              transition-all duration-700 transform
              ${subtitleVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-90'}
            `}>
              The imposter is  <span className="text-red-500 font-bold">{imposterName || 'UNKNOWN'}</span>
            </p>
        </div>

        {/* Play Again Button - Pale Yellow */}
        <div className={`transition-all duration-700 transform ${buttonVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'}`}>
          <button
            onClick={() => {
              console.log('PLAY AGAIN clicked - navigating to home');
              // Force navigation to home page
              window.location.href = '/';
            }}
            className="px-6 py-3 bg-retro-yellow text-retro-black font-pixel text-sm border-4 border-retro-black border-b-8 border-r-8 active:border-b-4 active:border-r-4 active:translate-y-1 active:translate-x-1 transition-all"
          >
            PLAY AGAIN
          </button>
        </div>
      </div>

      {/* Brick Footer */}
      <div className="mario-ground fixed bottom-0 left-0 w-full h-16 z-50"></div>

      {/* Retro scanlines overlay */}
      <div className="fixed inset-0 pointer-events-none z-30 opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

      <style>{`
        .clip-hide {
          clip-path: inset(0 100% 0 0);
        }
        .clip-show {
          clip-path: inset(0 0 0 0);
        }
      `}</style>
    </div>
  );
};

export default CivilianWin;
