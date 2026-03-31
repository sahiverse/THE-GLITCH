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
  
  // No grid needed - we use direct percentage positioning
  const cols = 4; // 4 columns for 4x4 layout
  const rows = 4;

  const assets = useMemo(() => {
    const instances: AssetInstance[] = [];
    
    // Create pool: heart:5, coin:5, diamond:5, bomb:5 (20 total)
    const typePool: AssetInstance['type'][] = [
      ...Array(5).fill('heart'),
      ...Array(5).fill('coin'),
      ...Array(5).fill('diamond'),
      ...Array(5).fill('bomb'),
    ];
    
    // Define 5 rows with Quincunx pattern - all 4 columns but staggered
    const rowConfigs = [
      { offset: 0,  positions: [5, 30, 70, 95] },    // Row 0: standard
      { offset: 12, positions: [17, 42, 58, 82] },   // Row 1: shifted right
      { offset: 0,  positions: [5, 30, 70, 95] },    // Row 2: standard
      { offset: 12, positions: [17, 42, 58, 82] },   // Row 3: shifted right
      { offset: 0,  positions: [5, 30, 70, 95] },    // Row 4: standard
    ];
    const rowPositions = [3, 20, 38, 56, 78]; // Spread down to cover bottom
    
    // Shuffle types
    for (let i = typePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [typePool[i], typePool[j]] = [typePool[j], typePool[i]];
    }
    
    // Create slots (5 rows x 4 cols = 20)
    const slots: {row: number, col: number}[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 4; c++) {
        slots.push({row: r, col: c});
      }
    }
    
    // Place assets with constraint: no same type adjacent
    const placed: {slot: typeof slots[0], type: AssetInstance['type']}[] = [];
    
    for (const slot of slots) {
      // Find which types are available (not used by neighbors)
      const neighborTypes = new Set<AssetInstance['type']>();
      for (const p of placed) {
        const rowDist = Math.abs(p.slot.row - slot.row);
        const colDist = Math.abs(p.slot.col - slot.col);
        // Adjacent = same row neighbor or directly above/below
        if ((rowDist === 0 && colDist === 1) || (rowDist === 1 && colDist <= 1)) {
          neighborTypes.add(p.type);
        }
      }
      
      // Pick a type not used by neighbors, prioritizing remaining count
      const availableTypes = typePool.filter(t => !neighborTypes.has(t));
      const typeToPlace = availableTypes.length > 0 
        ? availableTypes[Math.floor(Math.random() * availableTypes.length)]
        : typePool[Math.floor(Math.random() * typePool.length)]; // Fallback
      
      // Remove from pool
      const idx = typePool.indexOf(typeToPlace);
      typePool.splice(idx, 1);
      
      placed.push({slot, type: typeToPlace});
    }
    
    // Create instances from placed positions
    let idCounter = 0;
    for (const p of placed) {
      const slot = p.slot;
      const typeName = p.type;
      const typeInfo = ASSET_TYPES.find(t => t.type === typeName)!;
      
      const rowConfig = rowConfigs[slot.row];
      const baseLeft = rowConfig.positions[slot.col];
      const baseTop = rowPositions[slot.row];
      
      const isLargeAsset = typeName === 'bomb' || typeName === 'coin';
      const isMediumAsset = typeName === 'diamond';
      const baseScale = isLargeAsset ? 1.2 : isMediumAsset ? 1.0 : 0.8;
      
      instances.push({
        id: idCounter++,
        ...typeInfo,
        // Store percentage positions directly
        gridX: baseLeft + (Math.random() - 0.5) * 8, // ±4% jitter
        gridY: baseTop + (Math.random() - 0.5) * 8,
        offsetX: 0, // No additional offset needed
        offsetY: 0,
        speed: 0.015 + Math.random() * 0.035,
        scale: baseScale + Math.random() * 0.3,
        rotation: Math.random() * 360,
      });
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

        // gridX and gridY now store percentage positions directly
        const leftBase = asset.gridX;
        const topBase = asset.gridY;

        return (
          <div
            key={asset.id}
            className="absolute transition-transform duration-500 ease-out"
            style={{
              left: `${leftBase}%`,
              top: `${topBase}%`,
              transform: `translate(${moveX}px, ${moveY}px) scale(${asset.scale}) rotate(${asset.rotation}deg)`,
            }}
          >
            <img
              src={asset.src}
              alt={asset.type}
              className="w-12 h-12 md:w-16 md:h-16 object-contain opacity-70"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default FloatingAssets;