
import React from 'react';

interface PixelBoxProps {
  children: React.ReactNode;
  className?: string;
}

const PixelBox: React.FC<PixelBoxProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative bg-retro-white border-8 border-retro-black p-6 md:p-10 shadow-[6px_6px_0_0_#000] ${className}`}>
      {children}
    </div>
  );
};

export default PixelBox;
