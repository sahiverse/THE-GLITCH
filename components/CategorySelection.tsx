import React, { useState, useEffect } from 'react';
import RetroButton from './RetroButton';
import PixelBox from './PixelBox';

interface CategorySelectionProps {
  onConfirm: (category: 'SOURCE' | 'README') => void;
}

const CategorySelection: React.FC<CategorySelectionProps> = ({ onConfirm }) => {
  const [timeLeft, setTimeLeft] = useState(10);
  const [selection, setSelection] = useState<'SOURCE' | 'README' | null>(null);

  useEffect(() => {
    if (timeLeft <= 0) {
      onConfirm(selection || (Math.random() > 0.5 ? 'SOURCE' : 'README'));
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onConfirm, selection]);

  return (
    <div className="flex flex-col items-center w-full max-w-2xl animate-in fade-in zoom-in duration-500">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl text-retro-yellow drop-shadow-[4px_4px_0px_#000] uppercase mb-4 font-pixel">
          CHOOSE YOUR MODALITY
        </h1>
        <div className="bg-retro-black text-retro-white px-8 py-3 inline-block border-4 border-white shadow-[4px_4px_0_0_#000]">
          <span className="font-pixel text-2xl tracking-widest">
            {timeLeft < 10 ? `0${timeLeft}` : timeLeft}s
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* SOURCE OPTION */}
        <button 
          onClick={() => setSelection('SOURCE')}
          className={`group relative transition-all duration-200 transform ${selection === 'SOURCE' ? 'scale-105' : 'hover:scale-105'}`}
        >
          <PixelBox className={`h-full flex flex-col items-center text-center !p-6 ${selection === 'SOURCE' ? 'bg-red-50' : ''}`}>
            <span className="text-4xl mb-4 group-hover:animate-bounce">💻</span>
            <h2 className="font-pixel text-2xl text-retro-red mb-4">SOURCE</h2>
            <p className="font-mono text-sm text-retro-brick opacity-80 leading-relaxed uppercase">
              "Write in programming language"
              <br/>
              <span className="text-[10px] mt-2 block opacity-50">Pure Logic. Strict Syntax.</span>
            </p>
            {selection === 'SOURCE' && (
              <div className="mt-6 font-pixel text-[10px] text-retro-red animate-pulse">
                SELECTED
              </div>
            )}
          </PixelBox>
        </button>

        {/* README OPTION */}
        <button 
          onClick={() => setSelection('README')}
          className={`group relative transition-all duration-200 transform ${selection === 'README' ? 'scale-105' : 'hover:scale-105'}`}
        >
          <PixelBox className={`h-full flex flex-col items-center text-center !p-6 ${selection === 'README' ? 'bg-blue-50' : ''}`}>
            <span className="text-4xl mb-4 group-hover:animate-bounce">📖</span>
            <h2 className="font-pixel text-2xl text-retro-blue mb-4">README</h2>
            <p className="font-mono text-sm text-retro-brick opacity-80 leading-relaxed uppercase">
              "Write in natural language"
              <br/>
              <span className="text-[10px] mt-2 block opacity-50">Deep Lore. Human Context.</span>
            </p>
            {selection === 'README' && (
              <div className="mt-6 font-pixel text-[10px] text-retro-blue animate-pulse">
                SELECTED
              </div>
            )}
          </PixelBox>
        </button>
      </div>

      <div className="mt-12 w-full max-w-xs">
        <RetroButton 
          variant="success" 
          className="w-full py-5 text-xl"
          onClick={() => selection && onConfirm(selection)}
          disabled={!selection}
        >
          CONFIRM
        </RetroButton>
      </div>

      <p className="mt-8 font-pixel text-[8px] text-retro-black/50 uppercase">
        If you don't choose, the arena will choose for you.
      </p>
    </div>
  );
};

export default CategorySelection;