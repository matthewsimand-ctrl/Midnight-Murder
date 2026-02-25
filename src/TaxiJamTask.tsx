import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Car {
  id: number;
  x: number;
  y: number;
  len: number;
  horiz: boolean;
  isTaxi: boolean;
}

const LEVEL = [
  { id: 1, x: 1, y: 2, len: 2, horiz: true, isTaxi: true }, // Red car (taxi)
  { id: 2, x: 0, y: 0, len: 3, horiz: false, isTaxi: false },
  { id: 3, x: 1, y: 0, len: 2, horiz: true, isTaxi: false },
  { id: 4, x: 4, y: 0, len: 3, horiz: false, isTaxi: false },
  { id: 5, x: 1, y: 3, len: 2, horiz: false, isTaxi: false },
  { id: 6, x: 3, y: 1, len: 2, horiz: false, isTaxi: false },
  { id: 7, x: 4, y: 3, len: 2, horiz: true, isTaxi: false },
  { id: 8, x: 2, y: 4, len: 2, horiz: true, isTaxi: false },
  { id: 9, x: 0, y: 4, len: 2, horiz: false, isTaxi: false },
];

export function TaxiJamTask({ onComplete, onExit }: { onComplete: () => void, onExit: () => void }) {
  const [cars, setCars] = useState<Car[]>(LEVEL);
  const [selected, setSelected] = useState<number | null>(null);

  const canMove = (car: Car, dx: number, dy: number) => {
    const newX = car.x + dx;
    const newY = car.y + dy;
    
    // Bounds check
    if (newX < 0 || newY < 0) return false;
    if (car.horiz && newX + car.len > 6) return false;
    if (!car.horiz && newY + car.len > 6) return false;

    // Collision check
    for (const other of cars) {
      if (other.id === car.id) continue;
      
      const carCells = [];
      for (let i = 0; i < car.len; i++) {
        carCells.push({ x: newX + (car.horiz ? i : 0), y: newY + (!car.horiz ? i : 0) });
      }
      
      const otherCells = [];
      for (let i = 0; i < other.len; i++) {
        otherCells.push({ x: other.x + (other.horiz ? i : 0), y: other.y + (!other.horiz ? i : 0) });
      }
      
      for (const c1 of carCells) {
        for (const c2 of otherCells) {
          if (c1.x === c2.x && c1.y === c2.y) return false;
        }
      }
    }
    
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selected === null) return;
    
    const car = cars.find(c => c.id === selected);
    if (!car) return;
    
    let dx = 0, dy = 0;
    if (e.key === 'ArrowUp' && !car.horiz) dy = -1;
    if (e.key === 'ArrowDown' && !car.horiz) dy = 1;
    if (e.key === 'ArrowLeft' && car.horiz) dx = -1;
    if (e.key === 'ArrowRight' && car.horiz) dx = 1;
    
    if ((dx !== 0 || dy !== 0) && canMove(car, dx, dy)) {
      const newCars = cars.map(c => c.id === selected ? { ...c, x: c.x + dx, y: c.y + dy } : c);
      setCars(newCars);
      
      // Check win condition (Taxi reaches right edge)
      if (car.isTaxi && car.x + dx + car.len >= 6) {
        setTimeout(onComplete, 500);
      }
    }
  };

  return (
    <div 
      className="w-full max-w-sm flex flex-col items-center outline-none relative bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-2xl" 
      tabIndex={0} 
      onKeyDown={handleKeyDown}
    >
      <button 
        onClick={onExit}
        className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-50"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="text-center mb-6">
        <h4 className="font-bold text-lg mb-1">Taxi Jam</h4>
        <p className="text-sm text-zinc-400">Click a car and use arrows to move it. Get the yellow taxi to the exit.</p>
      </div>

      <div className="relative w-64 h-64 bg-zinc-800 border-4 border-zinc-700 rounded-lg overflow-hidden">
        {/* Exit marker */}
        <div className="absolute right-0 top-1/3 w-2 h-1/3 bg-zinc-900 z-0" />
        
        {cars.map(car => {
          const isSelected = selected === car.id;
          return (
            <div
              key={car.id}
              onClick={() => setSelected(car.id)}
              className={`absolute rounded-md cursor-pointer transition-all duration-200 z-10 ${
                car.isTaxi ? 'bg-yellow-400' : 'bg-blue-500'
              } ${isSelected ? 'ring-2 ring-white scale-[0.98]' : 'scale-95'}`}
              style={{
                left: `${(car.x / 6) * 100}%`,
                top: `${(car.y / 6) * 100}%`,
                width: `${(car.horiz ? car.len : 1) / 6 * 100}%`,
                height: `${(!car.horiz ? car.len : 1) / 6 * 100}%`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
