import React from 'react';

interface RetroButtonProps {
  variant?: 'primary' | 'danger' | 'warning' | 'success' | 'orange';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

const RetroButton: React.FC<RetroButtonProps> = ({ 
  variant = 'primary', 
  children, 
  onClick, 
  className = '',
  disabled = false
}) => {
  const baseStyles = "relative inline-block px-6 py-3 font-pixel text-sm uppercase tracking-wider transition-all duration-75 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed border-4 border-retro-black select-none";
  
  // Consistent black shadows for 3D vintage game button look
  const variants = {
    primary: "bg-retro-red text-retro-white shadow-[6px_6px_0_0_#000] hover:brightness-105",
    danger: "bg-retro-brick text-retro-white shadow-[6px_6px_0_0_#000] hover:brightness-105",
    warning: "bg-retro-yellow text-retro-black shadow-[6px_6px_0_0_#000] hover:brightness-105",
    success: "bg-[#55a039] text-retro-white shadow-[6px_6px_0_0_#000] hover:brightness-105",
    orange: "bg-[#f19121] text-retro-black shadow-[6px_6px_0_0_#000] hover:brightness-105",
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default RetroButton;