import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const WORDS = ["APPLE", "TRAIN", "HOUSE", "PLANT", "WATER", "GHOST", "SMILE", "BREAD", "CHAIR", "DREAM"];

export function WordleTask({ onComplete, onExit }: { onComplete: () => void, onExit: () => void }) {
  const [targetWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [shakeRow, setShakeRow] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (gameOver) return;
    
    if (e.key === 'Enter') {
      if (currentGuess.length === 5) {
        const newGuesses = [...guesses, currentGuess];
        setGuesses(newGuesses);
        setCurrentGuess("");
        
        if (currentGuess === targetWord) {
          setGameOver(true);
          setTimeout(onComplete, 1500);
        } else if (newGuesses.length >= 6) {
          setGameOver(true);
        }
      } else {
        setShakeRow(guesses.length);
        setTimeout(() => setShakeRow(-1), 500);
      }
    } else if (e.key === 'Backspace') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (/^[a-zA-Z]$/.test(e.key) && currentGuess.length < 5) {
      setCurrentGuess(prev => (prev + e.key).toUpperCase());
    }
  };

  const getLetterStatus = (letter: string, index: number, guess: string) => {
    if (targetWord[index] === letter) return "bg-emerald-500 border-emerald-500 text-white";
    if (targetWord.includes(letter)) {
      return "bg-yellow-500 border-yellow-500 text-white";
    }
    return "bg-zinc-800 border-zinc-700 text-zinc-400";
  };

  return (
    <div 
      className="w-full max-w-sm flex flex-col items-center outline-none relative bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-2xl" 
      tabIndex={0} 
      onKeyDown={handleKeyDown}
      onClick={() => inputRef.current?.focus()}
    >
      <button 
        onClick={onExit}
        className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-50"
      >
        <X className="w-6 h-6" />
      </button>

      <input 
        ref={inputRef}
        className="opacity-0 absolute pointer-events-none" 
        onBlur={() => inputRef.current?.focus()}
      />
      
      <div className="text-center mb-6">
        <h4 className="font-bold text-lg mb-1">Wordle</h4>
        <p className="text-sm text-zinc-400">Guess the 5-letter word.</p>
      </div>

      <div className="grid grid-rows-6 gap-2 mb-6">
        {Array.from({ length: 6 }).map((_, rowIndex) => {
          const isCurrentRow = rowIndex === guesses.length;
          const guess = guesses[rowIndex] || (isCurrentRow ? currentGuess : "");
          const isShaking = shakeRow === rowIndex;
          
          return (
            <div 
              key={rowIndex} 
              className={`grid grid-cols-5 gap-2 ${isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
            >
              {Array.from({ length: 5 }).map((_, colIndex) => {
                const letter = guess[colIndex] || "";
                let statusClass = "bg-zinc-900 border-zinc-700 text-white";
                
                if (rowIndex < guesses.length) {
                  statusClass = getLetterStatus(letter, colIndex, guess);
                } else if (letter) {
                  statusClass = "bg-zinc-800 border-zinc-500 text-white";
                }

                return (
                  <div 
                    key={colIndex} 
                    className={`w-12 h-12 border-2 flex items-center justify-center text-xl font-bold uppercase transition-colors ${statusClass}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {gameOver && currentGuess !== targetWord && guesses.length >= 6 && (
        <div className="text-red-400 font-bold mb-4 text-center">
          Word was: {targetWord}
          <div className="mt-2 text-sm text-zinc-400">Task Locked</div>
        </div>
      )}

      {gameOver && currentGuess !== targetWord && guesses.length >= 6 && (
        <button onClick={onExit} className="mt-2 w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl transition-colors">
          Exit
        </button>
      )}
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
