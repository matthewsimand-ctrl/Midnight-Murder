import React, { useState } from 'react';
import { X, Trophy, AlertCircle } from 'lucide-react';

const fallbackQuestions = [
  { question: "Name something you bring to the beach", answers: ["Towel", "Sunscreen", "Umbrella", "Cooler", "Beach ball"] },
  { question: "Name a reason you might be late to work", answers: ["Traffic", "Overslept", "Car trouble", "Bad weather", "Forgot something"] },
  { question: "Name something people do on a first date", answers: ["Dinner", "Movie", "Coffee", "Walk in park", "Try to impress"] },
  { question: "Name something you associate with vampires", answers: ["Blood", "Fangs", "Coffin", "Garlic", "Bats"] },
  { question: "Name a popular pizza topping", answers: ["Pepperoni", "Mushrooms", "Sausage", "Onions", "Peppers"] },
];

export function BackwardsFeudTask({ onComplete, onExit }: { onComplete: () => void, onExit: () => void }) {
  const [currentRound] = useState(() => fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)]);
  const [revealedCount, setRevealedCount] = useState(1);
  const [guesses, setGuesses] = useState<{text: string, correct: boolean}[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  
  const maxGuesses = 5;

  const checkGuess = () => {
    if (!currentGuess.trim() || gameState !== 'playing') return;

    const guess = currentGuess.toLowerCase().trim();
    const question = currentRound.question.toLowerCase();

    const questionWords = question
      .replace(/[?,.!]/g, '')
      .split(' ')
      .filter(w => w.length > 2 && !['name', 'something', 'that', 'would', 'could', 'with', 'your', 'their', 'the', 'are'].includes(w));

    const guessWords = guess
      .replace(/[?,.!]/g, '')
      .split(' ')
      .filter(w => w.length > 2);

    const matches = questionWords.filter(qw =>
      guessWords.some(gw => {
        return gw.includes(qw) || qw.includes(gw) ||
          Math.abs(gw.length - qw.length) <= 1 && (
            gw.substring(0, qw.length - 1) === qw.substring(0, qw.length - 1) ||
            gw.substring(1) === qw.substring(1)
          );
      })
    );

    const newGuesses = [...guesses, {
      text: currentGuess,
      correct: false,
    }];

    if (matches.length >= Math.max(1, Math.ceil(questionWords.length * 0.4))) {
      newGuesses[newGuesses.length - 1].correct = true;
      setGuesses(newGuesses);
      setGameState('won');
      setRevealedCount(5);
      setTimeout(onComplete, 2000);
    } else {
      setGuesses(newGuesses);
      if (newGuesses.length >= maxGuesses) {
        setGameState('lost');
        setRevealedCount(5);
      } else {
        if (revealedCount < 5) setRevealedCount(prev => prev + 1);
      }
    }

    setCurrentGuess('');
  };

  const giveUp = () => {
    setGameState('lost');
    setRevealedCount(5);
  };

  return (
    <div className="w-full max-w-md bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      <button 
        onClick={onExit}
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
      >
        <X size={24} />
      </button>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 to-orange-600 drop-shadow-md">
          BACKWARDS FEUD
        </h2>
        <p className="text-white text-sm font-medium">Guess the question from the answers!</p>
      </div>

      <div className="bg-white/10 backdrop-blur rounded-xl p-3 mb-4 flex justify-between items-center shadow-xl border-2 border-white/20">
        <div className="text-white text-center w-full">
          <div className="text-xs font-bold opacity-70">GUESSES</div>
          <div className="text-xl font-black">{guesses.length} / {maxGuesses}</div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-blue-600 to-blue-800 rounded-xl shadow-2xl p-4 mb-4 border-4 border-yellow-400">
        <div className="space-y-2">
          {currentRound.answers.map((answer, index) => {
            const answerNumber = index + 1;
            const displayIndex = 5 - answerNumber;
            const isRevealed = displayIndex < revealedCount;

            return (
              <div
                key={index}
                className={`flex items-center gap-3 transition-all duration-500 ${isRevealed ? 'opacity-100' : 'opacity-30'}`}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center font-black text-lg text-blue-900 shadow-lg border-2 border-yellow-300">
                  {answerNumber}
                </div>
                <div className={`flex-1 bg-white rounded-lg p-2 text-sm font-black text-blue-900 shadow-lg border-2 border-blue-200 ${isRevealed ? '' : 'blur-sm'}`}>
                  {isRevealed ? answer : '???????????'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {gameState === 'playing' && (
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4 shadow-xl border-2 border-white/20">
          <label className="text-white font-black mb-2 block text-xs">WHAT'S THE SURVEY QUESTION?</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={currentGuess}
              onChange={(e) => setCurrentGuess(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkGuess()}
              placeholder="Type your guess..."
              className="flex-1 px-3 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none font-medium shadow-inner text-sm text-black"
              disabled={guesses.length >= maxGuesses}
            />
            <button
              onClick={checkGuess}
              disabled={!currentGuess.trim() || guesses.length >= maxGuesses}
              className="bg-gradient-to-br from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-black transition-all shadow-lg border-2 border-green-400 disabled:opacity-50"
            >
              GUESS
            </button>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="flex gap-3 mb-4">
          <button
            onClick={giveUp}
            className="flex-1 bg-gradient-to-br from-red-500 to-red-600 text-white px-4 py-2 rounded-lg font-black transition-all shadow-lg border-2 border-red-400"
          >
            GIVE UP
          </button>
        </div>
      )}

      {gameState !== 'playing' && (
        <div className={`rounded-xl p-4 text-center border-2 ${gameState === 'won' ? 'bg-green-500/20 border-green-400' : 'bg-red-500/20 border-red-400'}`}>
          {gameState === 'won' ? (
            <div className="text-green-300 font-bold mb-2 flex items-center justify-center gap-2"><Trophy size={20}/> YOU GOT IT!</div>
          ) : (
            <div className="text-red-300 font-bold mb-2 flex items-center justify-center gap-2"><AlertCircle size={20}/> GAME OVER</div>
          )}
          <div className="text-white text-sm">The question was:</div>
          <div className="text-white font-black italic">"{currentRound.question}"</div>
          
          {gameState === 'lost' && (
            <button
              onClick={onExit}
              className="mt-4 bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-full font-bold backdrop-blur-sm transition-all"
            >
              Exit (Task Locked)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
