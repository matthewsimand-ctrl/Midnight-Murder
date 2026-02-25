import { useState, useRef, useEffect, useCallback } from "react";

const REFINED_PUZZLES = [
  { words: ["HEART", "FAST", "DOWN"],  answer: "break" },
  { words: ["WATER", "HOUSE", "BACK"], answer: "light" },
  { words: ["SUN",   "EYE",  "BALL"],  answer: "fire"  },
  { words: ["TOOTH", "HAIR", "HAND"],  answer: "brush" },
  { words: ["SNOW", "BASE", "FOOT"], answer: "ball" },
  { words: ["DOOR", "BOARD", "HOLE"], answer: "key" },
  { words: ["TIME", "LINE", "WORK"], answer: "out" },
  { words: ["LIFE", "BOAT", "GUARD"], answer: "life" },
  { words: ["BED", "BATH", "MATE"], answer: "room" },
  { words: ["AIR", "PORT", "PLANE"], answer: "air" },
  { words: ["BLACK", "BOARD", "BIRD"], answer: "black" },
];

function LetterBoxes({ answer, value, onChange, onSubmit, hintCount, isActive, errorMsg }: any) {
  const ghostRef = useRef<HTMLInputElement>(null);
  const len = answer.length;
  const letters = value.toLowerCase().split("").slice(0, len);

  const focusGhost = () => ghostRef.current?.focus({ preventScroll: true });

  useEffect(() => {
    if (isActive) {
      setTimeout(() => ghostRef.current?.focus({ preventScroll: true }), 50);
    }
  }, [isActive]);

  const handleGhostChange = (e: any) => {
    const raw = e.target.value.replace(/[^a-zA-Z]/g, "").toLowerCase();
    onChange(raw.slice(0, len));
  };

  const handleGhostKeyDown = (e: any) => {
    if (e.key === "Enter") { e.preventDefault(); onSubmit(); }
    if (e.key === "Backspace" && value === "" && hintCount > 0) e.preventDefault();
  };

  return (
    <div onClick={focusGhost} style={{ cursor: "text" }} className="flex flex-col items-center w-full">
      <input
        ref={ghostRef}
        className="fixed top-[-9999px] left-[-9999px] w-[1px] h-[1px] opacity-0 pointer-events-none text-[16px]"
        value={value}
        onChange={handleGhostChange}
        onKeyDown={handleGhostKeyDown}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={len}
      />

      <div className="flex gap-1.5 flex-wrap justify-center mb-3">
        {Array.from({ length: len }).map((_, i) => {
          const isHint = i < hintCount;
          const ch = letters[i] ?? "";
          const isCursor = i === Math.min(letters.length, len - 1) && isActive && letters.length < len;
          
          let boxClass = "w-9 h-11 bg-zinc-800 border-2 border-zinc-700 rounded-lg flex items-center justify-center font-mono text-lg font-bold text-white uppercase transition-colors";
          if (isHint) boxClass = "w-9 h-11 bg-emerald-900/20 border-2 border-emerald-500 rounded-lg flex items-center justify-center font-mono text-lg font-bold text-emerald-400 uppercase transition-colors";
          else if (ch) boxClass = "w-9 h-11 bg-zinc-800 border-2 border-zinc-500 rounded-lg flex items-center justify-center font-mono text-lg font-bold text-white uppercase transition-colors";
          else if (isCursor) boxClass = "w-9 h-11 bg-zinc-800 border-2 border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,1)] rounded-lg flex items-center justify-center font-mono text-lg font-bold text-white uppercase transition-colors";

          return (
            <div key={i} className={boxClass}>
              {isHint ? answer[i].toUpperCase() : ch.toUpperCase()}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-2 min-h-[44px] items-center w-full mt-2">
        <button 
          className="bg-emerald-600 text-white border-none rounded-lg px-6 py-2.5 font-sans text-sm font-semibold cursor-pointer transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={onSubmit} 
          disabled={value.length < len}
        >
          Submit
        </button>
        {value.length > hintCount && (
          <button 
            className="bg-transparent text-zinc-400 border border-zinc-700 rounded-lg px-4 py-2.5 font-sans text-sm cursor-pointer transition-colors hover:border-zinc-400 hover:text-zinc-200"
            onClick={() => onChange(answer.slice(0, hintCount).toLowerCase())}
          >
            Clear
          </button>
        )}
      </div>
      <div className="font-mono text-[11px] text-red-400 mt-2 tracking-wide min-h-[16px] text-center">{errorMsg}</div>
    </div>
  );
}

export function WordFuseTask({ onComplete, onExit }: { onComplete: () => void, onExit: () => void }) {
  const [puzzle] = useState(() => REFINED_PUZZLES[Math.floor(Math.random() * REFINED_PUZZLES.length)]);
  const [guess, setGuess] = useState("");
  const [hintCount, setHintCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [shaking, setShaking] = useState(false);
  const [wrongGuesses, setWrongGuesses] = useState(0);

  const setGuessSafe = useCallback((val: string) => {
    const answer = puzzle.answer.toLowerCase();
    const hintPrefix = answer.slice(0, hintCount);
    let safe = val.toLowerCase();
    if (!safe.startsWith(hintPrefix)) safe = hintPrefix + safe.slice(hintPrefix.length);
    safe = safe.slice(0, answer.length);
    setGuess(safe);
    if (errorMsg) setErrorMsg("");
  }, [puzzle.answer, hintCount, errorMsg]);

  const submitGuess = useCallback(() => {
    const g = guess.toLowerCase().trim();
    const a = puzzle.answer.toLowerCase();
    if (g.length < a.length) return;

    if (g === a) {
      onComplete();
    } else {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      
      const newWrong = wrongGuesses + 1;
      setWrongGuesses(newWrong);
      
      if (newWrong <= a.length - 1) {
        const newHintCount = Math.min(hintCount + 1, a.length - 1);
        setHintCount(newHintCount);
        const newHint = a.slice(0, newWrong).toUpperCase();
        setErrorMsg(`Hint: starts with "${newHint}"`);
        setGuess(a.slice(0, newHintCount));
      } else {
        setErrorMsg("Not quite — try again");
        setGuess(a.slice(0, hintCount));
      }
    }
  }, [guess, puzzle.answer, hintCount, wrongGuesses, onComplete]);

  return (
    <div className="w-full max-w-sm flex flex-col items-center">
      <div className="text-center mb-6">
        <h4 className="font-bold text-lg mb-1">Word Fuse</h4>
        <p className="text-sm text-zinc-400">
          Find the word that links these three clues.
        </p>
      </div>

      <div className={`w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 transition-all ${shaking ? 'animate-[shake_0.45s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}`}>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {puzzle.words.map((w, i) => (
            <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg py-3 px-2 text-center font-mono text-sm font-bold text-white uppercase tracking-wider">
              {w}
            </div>
          ))}
        </div>

        <LetterBoxes
          answer={puzzle.answer}
          value={guess}
          onChange={setGuessSafe}
          onSubmit={submitGuess}
          hintCount={hintCount}
          isActive={true}
          errorMsg={errorMsg}
        />
      </div>

      <button onClick={onExit} className="mt-4 w-full py-2 text-xs text-zinc-500 hover:text-zinc-300">Exit Task</button>
      
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15% { transform: translateX(-6px); } 30% { transform: translateX(6px); }
          45% { transform: translateX(-5px); } 60% { transform: translateX(5px); }
          75% { transform: translateX(-3px); } 90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
