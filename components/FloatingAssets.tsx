import React, { useState, useEffect, useMemo } from 'react';

interface AssetInstance {
  id: number;
  type: 'heart' | 'coin' | 'diamond' | 'bomb';
  src: string;
  gridX: number; // 0 to 3
  gridY: number; // 0 to 2
  offsetX: number; // -jitter to +jitter
  offsetY: number; // -jitter to +jitter
  speed: number;
  scale: number;
  rotation: number;
}

// Added explicit typing to ASSET_TYPES to resolve 'string is not assignable to union' error
const ASSET_TYPES: Array<{ type: AssetInstance['type']; src: string }> = [
  { type: 'heart', src: '/life.jpg' },
  { type: 'coin', src: '/coingif.gif' },
  { type: 'diamond', src: '/coin2.jpg' },
  { type: 'bomb', src: '/bomb.jpg' },
];

const FloatingAssets: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // We'll use a 4x3 grid to ensure assets are scattered across the screen
  const cols = 4;
  const rows = 3;

  const assets = useMemo(() => {
    const instances: AssetInstance[] = [];
    let idCounter = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const typeInfo = ASSET_TYPES[Math.floor(Math.random() * ASSET_TYPES.length)];
        
        instances.push({
          id: idCounter++,
          ...typeInfo,
          gridX: c,
          gridY: r,
          // Add random jitter within the grid cell (percentage)
          offsetX: (Math.random() - 0.5) * 15, 
          offsetY: (Math.random() - 0.5) * 15,
          speed: 0.015 + Math.random() * 0.035, // Sensitivity to mouse
          scale: 0.7 + Math.random() * 0.4,
          rotation: Math.random() * 360, // Random initial rotation
        });
      }
    }
    return instances;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {assets.map((asset) => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Parallax movement
        const moveX = (mousePos.x - centerX) * asset.speed;
        const moveY = (mousePos.y - centerY) * asset.speed;

        // Base position calculated from grid
        const leftBase = (asset.gridX * (100 / cols)) + (100 / (cols * 2));
        const topBase = (asset.gridY * (80 / rows)) + (80 / (rows * 2));

        return (
          <div
            key={asset.id}
            className="absolute transition-transform duration-500 ease-out"
            style={{
              left: `${leftBase + asset.offsetX}%`,
              top: `${topBase + asset.offsetY}%`,
              transform: `translate(${moveX}px, ${moveY}px) scale(${asset.scale}) rotate(${asset.rotation}deg)`,
            }}
          >
            <img
              src={asset.src}
              alt={asset.type}
              className="w-10 h-10 md:w-14 md:h-14 object-contain opacity-70"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default FloatingAssets;