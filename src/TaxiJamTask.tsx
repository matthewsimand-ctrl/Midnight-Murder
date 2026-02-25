import React, { useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface Car {
  id: number;
  x: number;
  y: number;
  len: number;
  horiz: boolean;
  isTaxi: boolean;
}

const LEVEL: Car[] = [
  { id: 1, x: 1, y: 2, len: 2, horiz: true, isTaxi: true },
  { id: 2, x: 0, y: 0, len: 3, horiz: false, isTaxi: false },
  { id: 3, x: 1, y: 0, len: 2, horiz: true, isTaxi: false },
  { id: 4, x: 4, y: 0, len: 3, horiz: false, isTaxi: false },
  { id: 5, x: 1, y: 3, len: 2, horiz: false, isTaxi: false },
  { id: 6, x: 3, y: 1, len: 2, horiz: false, isTaxi: false },
  { id: 7, x: 4, y: 3, len: 2, horiz: true, isTaxi: false },
  { id: 8, x: 2, y: 4, len: 2, horiz: true, isTaxi: false },
  { id: 9, x: 0, y: 4, len: 2, horiz: false, isTaxi: false },
];

const GRID_SIZE = 6;

export function TaxiJamTask({ onComplete, onExit }: { onComplete: () => void; onExit: () => void }) {
  const [cars, setCars] = useState<Car[]>(LEVEL.map(c => ({ ...c })));
  const [won, setWon] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{
    carId: number;
    startMouseGrid: number; // grid coord along axis at drag start
    startCarGrid: number;   // car's grid coord along axis at drag start
  } | null>(null);

  const canMoveTo = useCallback((movingId: number, newX: number, newY: number, currentCars: Car[]) => {
    const car = currentCars.find(c => c.id === movingId)!;
    if (newX < 0 || newY < 0) return false;
    if (car.horiz && newX + car.len > GRID_SIZE) return false;
    if (!car.horiz && newY + car.len > GRID_SIZE) return false;

    for (const other of currentCars) {
      if (other.id === movingId) continue;
      for (let i = 0; i < car.len; i++) {
        const cx = newX + (car.horiz ? i : 0);
        const cy = newY + (!car.horiz ? i : 0);
        for (let j = 0; j < other.len; j++) {
          const ox = other.x + (other.horiz ? j : 0);
          const oy = other.y + (!other.horiz ? j : 0);
          if (cx === ox && cy === oy) return false;
        }
      }
    }
    return true;
  }, []);

  const getGridCoord = useCallback((clientX: number, clientY: number) => {
    if (!boardRef.current) return { gx: 0, gy: 0 };
    const rect = boardRef.current.getBoundingClientRect();
    const cellW = rect.width / GRID_SIZE;
    const cellH = rect.height / GRID_SIZE;
    return {
      gx: (clientX - rect.left) / cellW,
      gy: (clientY - rect.top) / cellH,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, carId: number) => {
    e.preventDefault();
    const car = cars.find(c => c.id === carId)!;
    const { gx, gy } = getGridCoord(e.clientX, e.clientY);
    dragging.current = {
      carId,
      startMouseGrid: car.horiz ? gx : gy,
      startCarGrid: car.horiz ? car.x : car.y,
    };
  }, [cars, getGridCoord]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const { carId, startMouseGrid, startCarGrid } = dragging.current;
    const car = cars.find(c => c.id === carId)!;
    const { gx, gy } = getGridCoord(e.clientX, e.clientY);
    const currentGrid = car.horiz ? gx : gy;
    const delta = currentGrid - startMouseGrid;
    const newCoord = Math.round(startCarGrid + delta);

    const newX = car.horiz ? newCoord : car.x;
    const newY = !car.horiz ? newCoord : car.y;

    if (canMoveTo(carId, newX, newY, cars)) {
      setCars(prev => {
        const updated = prev.map(c => c.id === carId ? { ...c, x: newX, y: newY } : c);
        // Check win: taxi reaches right edge
        const taxi = updated.find(c => c.isTaxi)!;
        if (taxi.x + taxi.len >= GRID_SIZE) {
          setWon(true);
          setTimeout(onComplete, 600);
        }
        return updated;
      });
    }
  }, [cars, getGridCoord, canMoveTo, onComplete]);

  const handleMouseUp = useCallback(() => {
    dragging.current = null;
  }, []);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent, carId: number) => {
    const touch = e.touches[0];
    const car = cars.find(c => c.id === carId)!;
    const { gx, gy } = getGridCoord(touch.clientX, touch.clientY);
    dragging.current = {
      carId,
      startMouseGrid: car.horiz ? gx : gy,
      startCarGrid: car.horiz ? car.x : car.y,
    };
  }, [cars, getGridCoord]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!dragging.current) return;
    const touch = e.touches[0];
    const { carId, startMouseGrid, startCarGrid } = dragging.current;
    const car = cars.find(c => c.id === carId)!;
    const { gx, gy } = getGridCoord(touch.clientX, touch.clientY);
    const currentGrid = car.horiz ? gx : gy;
    const delta = currentGrid - startMouseGrid;
    const newCoord = Math.round(startCarGrid + delta);

    const newX = car.horiz ? newCoord : car.x;
    const newY = !car.horiz ? newCoord : car.y;

    if (canMoveTo(carId, newX, newY, cars)) {
      setCars(prev => {
        const updated = prev.map(c => c.id === carId ? { ...c, x: newX, y: newY } : c);
        const taxi = updated.find(c => c.isTaxi)!;
        if (taxi.x + taxi.len >= GRID_SIZE) {
          setWon(true);
          setTimeout(onComplete, 600);
        }
        return updated;
      });
    }
  }, [cars, getGridCoord, canMoveTo, onComplete]);

  const handleTouchEnd = useCallback(() => {
    dragging.current = null;
  }, []);

  return (
    <div className="w-full max-w-sm flex flex-col items-center relative bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-2xl">
      <button
        onClick={onExit}
        className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-50"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="text-center mb-4">
        <h4 className="font-bold text-lg mb-1">Taxi Jam</h4>
        <p className="text-sm text-zinc-400 leading-snug">
          <span className="text-yellow-400 font-semibold">Drag the yellow taxi</span> to the right exit. Move blocking cars out of its path!
        </p>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className="relative w-64 h-64 bg-zinc-800 border-4 border-zinc-700 rounded-lg select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ touchAction: 'none' }}
      >
        {/* Exit arrow */}
        <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex items-center">
          <div className="w-4 h-0.5 bg-yellow-400"></div>
          <div className="w-0 h-0 border-t-4 border-b-4 border-l-6 border-transparent border-l-yellow-400 ml-0.5" style={{ borderLeftWidth: 6 }}></div>
        </div>
        {/* Exit gap */}
        <div className="absolute right-0 top-1/3 w-1 h-1/3 bg-zinc-800 z-20" />

        {cars.map(car => (
          <div
            key={car.id}
            onMouseDown={(e) => handleMouseDown(e, car.id)}
            onTouchStart={(e) => handleTouchStart(e, car.id)}
            onTouchMove={(e) => handleTouchMove(e, car.id)}
            onTouchEnd={handleTouchEnd}
            className={`absolute rounded-md cursor-grab active:cursor-grabbing transition-shadow z-10 flex items-center justify-center ${
              car.isTaxi
                ? 'bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]'
                : 'bg-blue-500'
            } ${won && car.isTaxi ? 'ring-4 ring-white animate-pulse' : ''}`}
            style={{
              left: `${(car.x / GRID_SIZE) * 100}%`,
              top: `${(car.y / GRID_SIZE) * 100}%`,
              width: `${((car.horiz ? car.len : 1) / GRID_SIZE) * 100}%`,
              height: `${((!car.horiz ? car.len : 1) / GRID_SIZE) * 100}%`,
              userSelect: 'none',
            }}
          >
            {car.isTaxi && (
              <span className="text-xs font-black text-yellow-900 select-none">🚕</span>
            )}
          </div>
        ))}
      </div>

      {won && (
        <div className="mt-4 text-emerald-400 font-bold text-center animate-bounce">
          Taxi escaped! ✓
        </div>
      )}
    </div>
  );
}
