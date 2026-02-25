/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { getSocket } from "./socket";
import { motion, AnimatePresence } from "motion/react";
import { Users, AlertCircle, CheckCircle2, Search, Skull, Eye, Shield, UserX, X, LogOut, BookOpen, Monitor, Tv, Gamepad2, Copy, Check, Zap } from "lucide-react";
import { WordFuseTask } from "./WordFuseTask";
import { WordleTask } from "./WordleTask";
import { TaxiJamTask } from "./TaxiJamTask";
import { BackwardsFeudTask } from "./BackwardsFeudTask";

type Role = "killer" | "witness" | "investigator" | "forensics";
type TaskType = "word_fuse" | "wordle" | "backwards_feud" | "taxi_jam";

interface Player {
  id: string;
  name: string;
  role: Role | null;
  attributes: {
    handedness: string;
    hairColor: string;
    shoeType: string;
    tshirtDesign: string;
    occupation: string;
    height: string;
    accessory: string;
  };
  isHost: boolean;
  votedFor: string | null;
  x: number;
  y: number;
  color: string;
  hasStolenClue: boolean;
}

interface Clue {
  id: string;
  text: string;
  isTampered: boolean;
  foundBy: string;
}

interface GameTask {
  id: string;
  x: number;
  y: number;
  type: TaskType;
  completed: boolean;
  lockedFor: string[];
}

interface Lobby {
  id: string;
  status: "lobby" | "playing" | "discussion" | "voting" | "witness_guessing" | "game_over";
  players: Player[];
  clues: Clue[];
  tasks: GameTask[];
  startTime: number | null;
  endTime: number | null;
  winner: "killer" | "investigators" | null;
}

const DOORS = [
  { x: 596, y: 300, w: 8, h: 100 },
  { x: 1396, y: 300, w: 8, h: 100 },
  { x: 300, y: 596, w: 100, h: 8 },
  { x: 950, y: 596, w: 100, h: 8 },
  { x: 1600, y: 596, w: 100, h: 8 },
  { x: 596, y: 950, w: 8, h: 100 },
  { x: 1396, y: 950, w: 8, h: 100 },
  { x: 300, y: 1396, w: 100, h: 8 },
  { x: 950, y: 1396, w: 100, h: 8 },
  { x: 1600, y: 1396, w: 100, h: 8 },
];

const getTaskIcon = (type: TaskType) => {
  switch (type) {
    case "word_fuse": return <BookOpen className="w-8 h-8" />;
    case "wordle": return <Monitor className="w-8 h-8" />;
    case "backwards_feud": return <Tv className="w-8 h-8" />;
    case "taxi_jam": return <Gamepad2 className="w-8 h-8" />;
  }
};

const ROLE_INFO: Record<Role, { icon: React.ReactNode; color: string; bg: string; border: string; title: string; description: string }> = {
  killer: {
    icon: <Skull className="w-16 h-16" />,
    color: "text-red-400",
    bg: "bg-red-950",
    border: "border-red-500",
    title: "You are the Killer",
    description: "Complete tasks to blend in. Tamper with clues to mislead investigators. Once per game, get close to a player to steal one of their discovered clues — or plant a fake one if they have none!",
  },
  witness: {
    icon: <Eye className="w-16 h-16" />,
    color: "text-blue-400",
    bg: "bg-blue-950",
    border: "border-blue-500",
    title: "You are the Witness",
    description: "You secretly saw the killer. Help investigators find the truth. Complete tasks and guide the group — but stay hidden, because if the killer identifies you, they win!",
  },
  investigator: {
    icon: <Search className="w-16 h-16" />,
    color: "text-emerald-400",
    bg: "bg-emerald-950",
    border: "border-emerald-500",
    title: "You are an Investigator",
    description: "Complete tasks to uncover clues. Analyze the evidence during discussion and vote out the killer. Work together — the killer wins if the vote fails!",
  },
  forensics: {
    icon: <Shield className="w-16 h-16" />,
    color: "text-purple-400",
    bg: "bg-purple-950",
    border: "border-purple-500",
    title: "You are the Forensics Expert",
    description: "Complete tasks to find clues. You have a special ability: you can tell which clues have been tampered with by the killer! Use this knowledge to guide the vote.",
  },
};

// Role reveal overlay
function RoleRevealOverlay({ role, onDone }: { role: Role; onDone: () => void }) {
  const info = ROLE_INFO[role];
  useEffect(() => {
    const t = setTimeout(onDone, 5000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
        className={`max-w-md w-full mx-4 ${info.bg} border-2 ${info.border} rounded-3xl p-10 text-center shadow-2xl`}
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
          className={`${info.color} flex justify-center mb-6`}
        >
          {info.icon}
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={`text-3xl font-black mb-4 ${info.color}`}
        >
          {info.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-zinc-300 text-base leading-relaxed"
        >
          {info.description}
        </motion.p>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          onClick={onDone}
          className="mt-8 px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
        >
          Let's Go →
        </motion.button>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-3 text-zinc-600 text-xs"
        >
          Auto-continues in 5 seconds
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.on("lobby_update", (updatedLobby: Lobby) => {
      setLobby(updatedLobby);
    });

    socket.on("game_started", (updatedLobby: Lobby) => {
      setLobby(updatedLobby);
      setShowRoleReveal(true);
    });

    socket.on("clue_found", (clues: Clue[]) => {
      setLobby((prev) => prev ? { ...prev, clues } : null);
    });

    socket.on("task_update", (tasks: GameTask[]) => {
      setLobby((prev) => prev ? { ...prev, tasks } : null);
    });

    socket.on("player_moved", ({ id, x, y }: { id: string, x: number, y: number }) => {
      setLobby((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map(p => p.id === id ? { ...p, x, y } : p)
        };
      });
    });

    socket.on("left_lobby", () => {
      setLobby(null);
      setPlayerId(null);
    });

    return () => {
      socket.off("lobby_update");
      socket.off("game_started");
      socket.off("clue_found");
      socket.off("task_update");
      socket.off("player_moved");
      socket.off("left_lobby");
    };
  }, []);

  const handleCopyCode = () => {
    if (lobby?.id) {
      navigator.clipboard.writeText(lobby.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateLobby = () => {
    if (!name.trim()) {
      setError("Please enter a name");
      return;
    }
    setError("");
    getSocket().emit("create_lobby", name, (res: any) => {
      if (res.error) {
        setError(res.error);
      } else {
        setPlayerId(res.playerId);
      }
    });
  };

  const handleJoinLobby = () => {
    if (!name.trim() || !joinCode.trim()) {
      setError("Please enter a name and lobby code");
      return;
    }
    setError("");
    getSocket().emit("join_lobby", joinCode.toUpperCase(), name, (res: any) => {
      if (res.error) {
        setError(res.error);
      } else {
        setPlayerId(res.playerId);
      }
    });
  };

  if (!lobby) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900 rounded-2xl p-8 shadow-2xl border border-zinc-800"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Among Sus</h1>
            <p className="text-zinc-400">Find the killer before time runs out.</p>
          </div>

          <div className="space-y-5">
            {/* Step 1: Name */}
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                  Your Name
                </span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateLobby(); }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="Enter your display name"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Step 2: Create */}
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                  Create or Join a Lobby
                </span>
              </label>
              <button
                onClick={handleCreateLobby}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl px-4 py-3 transition-colors flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                Create New Lobby
              </button>
            </div>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink-0 mx-4 text-zinc-500 text-sm">or join an existing one</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Enter the 6-letter lobby code shared by your host</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleJoinLobby(); }}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all uppercase font-mono tracking-widest text-center"
                  placeholder="ABC123"
                  maxLength={6}
                />
                <button
                  onClick={handleJoinLobby}
                  className="bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-xl px-6 py-3 transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const player = lobby.players.find((p) => p.id === playerId);

  return (
    <>
      <AnimatePresence>
        {showRoleReveal && player?.role && (
          <RoleRevealOverlay role={player.role} onDone={() => setShowRoleReveal(false)} />
        )}
      </AnimatePresence>
      <GameView lobby={lobby} playerId={playerId!} onCopyCode={handleCopyCode} copied={copied} />
    </>
  );
}

function GameView({ lobby, playerId, onCopyCode, copied }: { lobby: Lobby; playerId: string; onCopyCode: () => void; copied: boolean }) {
  const player = lobby.players.find((p) => p.id === playerId);
  const isHost = player?.isHost;

  if (lobby.status === "lobby") {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans flex flex-col items-center">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold">Lobby</h2>
            <div className="inline-flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-3">
              <span className="text-zinc-400 text-sm font-medium">Code:</span>
              <span className="text-emerald-400 font-mono tracking-widest text-2xl font-bold">{lobby.id}</span>
              <button
                onClick={onCopyCode}
                className="ml-1 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-zinc-500 text-sm">Share this code with friends to invite them!</p>
            <p className="text-zinc-400">Waiting for players... ({lobby.players.length}/10)</p>
          </div>

          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="font-medium text-zinc-300 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players
              </h3>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {lobby.players.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <span className="font-medium flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }}></div>
                    {p.name} {p.id === playerId && <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full">You</span>}
                  </span>
                  {p.isHost && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">Host</span>}
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <button
              onClick={() => getSocket().emit("start_game", lobby.id)}
              disabled={lobby.players.length < 3}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-xl px-4 py-4 transition-colors text-lg"
            >
              {lobby.players.length < 3 ? "Need at least 3 players" : "Start Game"}
            </button>
          )}

          <button
            onClick={() => getSocket().emit("leave_lobby", lobby.id)}
            className="w-full bg-zinc-800 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 font-medium rounded-xl px-4 py-4 transition-colors text-lg flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Leave Lobby
          </button>
        </div>
      </div>
    );
  }

  if (lobby.status === "playing") {
    return <PlayingView lobby={lobby} player={player!} />;
  }

  if (lobby.status === "discussion") {
    return <DiscussionView lobby={lobby} player={player!} />;
  }

  if (lobby.status === "voting") {
    return <VotingView lobby={lobby} player={player!} />;
  }

  if (lobby.status === "witness_guessing") {
    return <WitnessGuessingView lobby={lobby} player={player!} />;
  }

  if (lobby.status === "game_over") {
    return <GameOverView lobby={lobby} player={player!} />;
  }

  return null;
}

function PlayingView({ lobby, player }: { lobby: Lobby; player: Player }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeTask, setActiveTask] = useState<GameTask | null>(null);
  const [localPos, setLocalPos] = useState({ x: player.x, y: player.y });
  const keys = useRef<{ [key: string]: boolean }>({});
  const requestRef = useRef<number>();
  const lastEmitTime = useRef(0);
  const [stealTarget, setStealTarget] = useState<Player | null>(null);
  const [stealUsed, setStealUsed] = useState(player.hasStolenClue);
  const [stealFeedback, setStealFeedback] = useState("");

  useEffect(() => {
    if (lobby.endTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((lobby.endTime! - Date.now()) / 1000));
        setTimeLeft(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lobby.endTime]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const updatePosition = useCallback(() => {
    if (activeTask) {
      requestRef.current = requestAnimationFrame(updatePosition);
      return;
    }

    const speed = 5;
    let dx = 0;
    let dy = 0;

    if (keys.current["w"] || keys.current["arrowup"]) dy -= speed;
    if (keys.current["s"] || keys.current["arrowdown"]) dy += speed;
    if (keys.current["a"] || keys.current["arrowleft"]) dx -= speed;
    if (keys.current["d"] || keys.current["arrowright"]) dx += speed;

    if (dx !== 0 || dy !== 0) {
      setLocalPos(prev => {
        let finalX = prev.x + dx;
        let finalY = prev.y + dy;

        finalX = Math.max(120, Math.min(1880, finalX));
        finalY = Math.max(120, Math.min(1880, finalY));

        const wallX = [600, 1400];
        for (const wx of wallX) {
          if ((prev.x <= wx - 15 && finalX > wx - 15) || (prev.x >= wx + 15 && finalX < wx + 15)) {
            const inDoor = DOORS.some(d => d.w === 8 && Math.abs(d.x + 4 - wx) < 10 && prev.y > d.y && prev.y < d.y + d.h);
            if (!inDoor) finalX = prev.x < wx ? wx - 15 : wx + 15;
          }
        }

        const wallY = [600, 1400];
        for (const wy of wallY) {
          if ((prev.y <= wy - 15 && finalY > wy - 15) || (prev.y >= wy + 15 && finalY < wy + 15)) {
            const inDoor = DOORS.some(d => d.h === 8 && Math.abs(d.y + 4 - wy) < 10 && finalX > d.x && finalX < d.x + d.w);
            if (!inDoor) finalY = prev.y < wy ? wy - 15 : wy + 15;
          }
        }

        const now = Date.now();
        if (now - lastEmitTime.current > 50) {
          getSocket().emit("move", lobby.id, finalX, finalY);
          lastEmitTime.current = now;
        }

        return { x: finalX, y: finalY };
      });
    }

    requestRef.current = requestAnimationFrame(updatePosition);
  }, [activeTask, lobby.id]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updatePosition);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [updatePosition]);

  useEffect(() => {
    if (Math.abs(player.x - localPos.x) > 100 || Math.abs(player.y - localPos.y) > 100) {
      setLocalPos({ x: player.x, y: player.y });
    }
  }, [player.x, player.y]);

  // Close active task if it gets completed by someone else OR game ends
  useEffect(() => {
    if (activeTask) {
      const currentTaskState = lobby.tasks.find(t => t.id === activeTask.id);
      if (!currentTaskState || currentTaskState.completed) {
        setActiveTask(null);
      }
    }
  }, [lobby.tasks, activeTask]);

  // Close active task if game status changed away from playing
  useEffect(() => {
    if (lobby.status !== "playing" && activeTask) {
      setActiveTask(null);
    }
  }, [lobby.status, activeTask]);

  // Sync steal used from server
  useEffect(() => {
    setStealUsed(player.hasStolenClue);
  }, [player.hasStolenClue]);

  const handleCompleteTask = () => {
    if (activeTask) {
      getSocket().emit("task_completed", lobby.id, activeTask.id);
      setActiveTask(null);
    }
  };

  const handleExitTask = () => {
    if (activeTask) {
      getSocket().emit("lock_task", lobby.id, activeTask.id);
      setActiveTask(null);
    }
  };

  const nearbyTask = lobby.tasks.find(t =>
    !t.completed && !t.lockedFor.includes(player.id) && Math.hypot(t.x - localPos.x, t.y - localPos.y) < 80
  );

  // Nearby player for killer steal ability
  const nearbyPlayerForSteal = player.role === "killer" && !stealUsed
    ? lobby.players.find(p => p.id !== player.id && Math.hypot(p.x - localPos.x, p.y - localPos.y) < 100)
    : null;

  useEffect(() => {
    const handleInteract = (e: KeyboardEvent) => {
      if (e.code === "Space" && nearbyTask && !activeTask) {
        setActiveTask(nearbyTask);
      }
      if (e.code === "KeyF" && nearbyPlayerForSteal && !stealUsed && !activeTask) {
        handleStealClue();
      }
    };
    window.addEventListener("keydown", handleInteract);
    return () => window.removeEventListener("keydown", handleInteract);
  }, [nearbyTask, activeTask, nearbyPlayerForSteal, stealUsed]);

  const handleStealClue = () => {
    if (!nearbyPlayerForSteal || stealUsed) return;
    getSocket().emit("steal_clue", lobby.id, nearbyPlayerForSteal.id, (res: any) => {
      if (res?.error) {
        setStealFeedback("Failed: " + res.error);
      } else {
        setStealUsed(true);
        setStealFeedback(res?.message || "Clue stolen!");
      }
      setTimeout(() => setStealFeedback(""), 3000);
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col overflow-hidden relative">
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-4">
            <div className="bg-zinc-900/90 backdrop-blur p-4 rounded-2xl border border-zinc-800 pointer-events-auto shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-800 rounded-xl">
                  {player.role === "killer" && <Skull className="w-6 h-6 text-red-400" />}
                  {player.role === "witness" && <Eye className="w-6 h-6 text-blue-400" />}
                  {player.role === "investigator" && <Search className="w-6 h-6 text-emerald-400" />}
                  {player.role === "forensics" && <Shield className="w-6 h-6 text-purple-400" />}
                </div>
                <div>
                  <div className="text-sm text-zinc-400 uppercase tracking-wider font-semibold">Your Role</div>
                  <div className="text-xl font-bold capitalize text-white">{player.role}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="text-sm text-zinc-400 mb-2">Clues Found by Team: {lobby.clues.length}</div>
                <div className="w-full bg-zinc-950 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, lobby.clues.length * 10)}%` }}></div>
                </div>
              </div>

              {/* Killer steal ability */}
              {player.role === "killer" && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <div className={`text-sm font-semibold mb-1 flex items-center gap-1.5 ${stealUsed ? "text-zinc-600" : "text-red-400"}`}>
                    <Zap className="w-4 h-4" />
                    Clue Sabotage {stealUsed ? "(Used)" : "(1 use)"}
                  </div>
                  <div className="text-xs text-zinc-500">Get close to a player and press the button to steal their clue.</div>
                  {stealFeedback && <div className="text-xs text-red-400 mt-1">{stealFeedback}</div>}
                </div>
              )}
            </div>

            <button
              onClick={() => getSocket().emit("leave_lobby", lobby.id)}
              className="bg-zinc-900/90 hover:bg-red-900/50 backdrop-blur p-3 rounded-2xl border border-zinc-800 pointer-events-auto shadow-xl flex items-center gap-2 text-zinc-400 hover:text-red-400 transition-colors w-fit"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-bold">Leave Game</span>
            </button>
          </div>

          <div className="bg-zinc-900/90 backdrop-blur p-4 rounded-2xl border border-zinc-800 pointer-events-auto shadow-xl text-right">
            <div className="text-sm text-zinc-400 uppercase tracking-wider font-semibold">Time Remaining</div>
            <div className="text-3xl font-mono font-bold text-emerald-400">
              {mins}:{secs.toString().padStart(2, "0")}
            </div>
          </div>
        </div>
      </div>

      {/* Game World */}
      <div className="flex-grow relative overflow-hidden bg-zinc-950">
        <div
          className="absolute top-1/2 left-1/2"
          style={{ transform: `translate(${-localPos.x}px, ${-localPos.y}px)` }}
        >
          {/* Mansion Background */}
          <div className="absolute top-0 left-0 w-[2000px] h-[2000px] border-8 border-zinc-800 bg-zinc-900 rounded-lg overflow-hidden">
            {[
              { name: "Library", x: 100, y: 100, w: 500, h: 500, color: "bg-amber-900/10 border-amber-900/30" },
              { name: "Kitchen", x: 1400, y: 100, w: 500, h: 500, color: "bg-stone-800/20 border-stone-700/30" },
              { name: "Dining Room", x: 700, y: 100, w: 600, h: 500, color: "bg-rose-900/10 border-rose-900/30" },
              { name: "Main Hall", x: 600, y: 700, w: 800, h: 600, color: "bg-zinc-800/20 border-zinc-700/30" },
              { name: "Bedroom 1", x: 100, y: 1400, w: 500, h: 500, color: "bg-indigo-900/10 border-indigo-900/30" },
              { name: "Bedroom 2", x: 1400, y: 1400, w: 500, h: 500, color: "bg-purple-900/10 border-purple-900/30" },
              { name: "Garden", x: 700, y: 1400, w: 600, h: 500, color: "bg-emerald-900/10 border-emerald-900/30" },
              { name: "West Corridor", x: 300, y: 600, w: 300, h: 800, color: "bg-zinc-800/10 border-zinc-800/30" },
              { name: "East Corridor", x: 1400, y: 600, w: 300, h: 800, color: "bg-zinc-800/10 border-zinc-800/30" },
            ].map((room, i) => (
              <div
                key={i}
                className={`absolute border-4 flex items-center justify-center ${room.color}`}
                style={{ left: room.x, top: room.y, width: room.w, height: room.h }}
              >
                <span className="text-2xl font-bold text-white/10 uppercase tracking-widest">{room.name}</span>
              </div>
            ))}
            {DOORS.map((door, i) => (
              <div
                key={`door-${i}`}
                className="absolute bg-zinc-900"
                style={{ left: door.x, top: door.y, width: door.w, height: door.h }}
              />
            ))}
          </div>

          {/* Tasks */}
          {lobby.tasks.map(task => {
            const isLocked = task.lockedFor.includes(player.id);
            return (
              <div
                key={task.id}
                className={`absolute w-16 h-16 -ml-8 -mt-8 rounded-lg border-b-4 flex items-center justify-center transition-all shadow-lg ${
                  task.completed
                    ? "bg-zinc-800 border-zinc-900 opacity-50"
                    : isLocked
                    ? "bg-red-900 border-red-950 opacity-50"
                    : "bg-amber-700 border-amber-900 animate-pulse"
                }`}
                style={{ left: task.x, top: task.y }}
              >
                <div className="text-white/80">{getTaskIcon(task.type)}</div>
              </div>
            );
          })}

          {/* Other Players */}
          {lobby.players.filter(p => p.id !== player.id).map(p => {
            const isNearbyStealTarget = nearbyPlayerForSteal?.id === p.id;
            return (
              <div
                key={p.id}
                className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-2 shadow-lg flex items-center justify-center transition-all duration-100 ${
                  isNearbyStealTarget ? "border-red-400 shadow-red-500/50 shadow-lg" : "border-white/20"
                }`}
                style={{ left: p.x, top: p.y, backgroundColor: p.color }}
              >
                <span className="absolute -top-6 text-xs font-bold text-white whitespace-nowrap bg-black/50 px-2 py-0.5 rounded">{p.name}</span>
                {isNearbyStealTarget && (
                  <span className="absolute -bottom-7 text-xs font-bold text-red-400 whitespace-nowrap bg-black/70 px-2 py-0.5 rounded border border-red-500/50">
                    [F] Steal
                  </span>
                )}
              </div>
            );
          })}

          {/* Local Player */}
          <div
            className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] flex items-center justify-center z-20"
            style={{ left: localPos.x, top: localPos.y, backgroundColor: player.color }}
          >
            <span className="absolute -top-6 text-xs font-bold text-white whitespace-nowrap bg-black/80 px-2 py-0.5 rounded">{player.name}</span>
          </div>
        </div>
      </div>

      {/* Interaction Prompts */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
        {nearbyTask && !activeTask && (
          <div className="bg-white text-zinc-900 px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-bounce">
            <span className="bg-zinc-200 px-2 py-1 rounded text-sm">SPACE</span>
            Use Task
          </div>
        )}
        {nearbyPlayerForSteal && !activeTask && (
          <button
            onClick={handleStealClue}
            className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 transition-colors border-2 border-red-400"
          >
            <Zap className="w-4 h-4" />
            Steal Clue from {nearbyPlayerForSteal.name}
          </button>
        )}
      </div>

      {/* Task Modal */}
      {activeTask && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 max-w-lg w-full relative shadow-2xl">
            <button
              onClick={handleExitTask}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-50"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="mt-4 flex justify-center w-full">
              {activeTask.type === "word_fuse" && <WordFuseTask onComplete={handleCompleteTask} onExit={handleExitTask} />}
              {activeTask.type === "wordle" && <WordleTask onComplete={handleCompleteTask} onExit={handleExitTask} />}
              {activeTask.type === "taxi_jam" && <TaxiJamTask onComplete={handleCompleteTask} onExit={handleExitTask} />}
              {activeTask.type === "backwards_feud" && <BackwardsFeudTask onComplete={handleCompleteTask} onExit={handleExitTask} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiscussionView({ lobby, player }: { lobby: Lobby; player: Player }) {
  const isHost = player.isHost;
  const tamperedCount = lobby.clues.filter(c => c.isTampered).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Discussion Phase</h2>
          <p className="text-zinc-400">Review the evidence and discuss who the killer might be.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Search className="w-5 h-5 text-emerald-400" />
                Evidence Found
              </h3>
              <div className="text-sm bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
                <span className="text-red-400 font-bold">{tamperedCount}</span> clues are fake
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 flex-grow content-start">
              {lobby.clues.map((clue, i) => (
                <div key={clue.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50 flex items-start gap-3">
                  <div className="bg-zinc-900 text-zinc-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</div>
                  <div>
                    <div className="font-mono text-emerald-400">{clue.text}</div>
                    {player.role === "forensics" && clue.isTampered && (
                      <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> FAKE EVIDENCE
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {lobby.clues.length === 0 && (
                <div className="text-center text-zinc-500 py-8">No evidence was found. Good luck.</div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Players
              </h3>
            </div>
            <div className="flex flex-col gap-3 flex-grow content-start">
              {lobby.players.map((p) => (
                <div key={p.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                      {p.name} {p.id === player.id && <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">You</span>}
                    </span>
                    {p.isHost && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">Host</span>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-400 ml-5">
                    <span className="capitalize">Role: {p.id === player.id ? p.role : 'Hidden'}</span>
                    <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                    <span className="text-emerald-400 font-medium">Status: Alive</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {isHost && (
          <button
            onClick={() => getSocket().emit("start_voting", lobby.id)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl px-4 py-4 transition-colors text-lg"
          >
            Begin Voting
          </button>
        )}
        {!isHost && <div className="text-center text-zinc-500">Waiting for host to start voting...</div>}
      </div>
    </div>
  );
}

function VotingView({ lobby, player }: { lobby: Lobby; player: Player }) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleVote = () => {
    if (selected) {
      getSocket().emit("vote", lobby.id, selected);
    }
  };

  if (player.votedFor) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-bold">Vote Cast</h2>
          <p className="text-zinc-400">Waiting for others to vote...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Who is the Killer?</h2>
          <p className="text-zinc-400">Cast your vote. Majority rules. Ties favor the killer.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lobby.players.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selected === p.id
                  ? "bg-emerald-900/30 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="font-medium text-lg">{p.name}</div>
              {p.id === player.id && <div className="text-xs text-zinc-500 mt-1">You</div>}
            </button>
          ))}
        </div>
        <button
          onClick={handleVote}
          disabled={!selected}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-xl px-4 py-4 transition-colors text-lg"
        >
          Confirm Vote
        </button>
      </div>
    </div>
  );
}

function WitnessGuessingView({ lobby, player }: { lobby: Lobby; player: Player }) {
  const [selected, setSelected] = useState<string | null>(null);

  if (player.role !== "killer") {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
          <h2 className="text-2xl font-bold">Killer Caught!</h2>
          <p className="text-zinc-400">The killer is trying to guess who the witness is. If they guess correctly, they still win!</p>
        </div>
      </div>
    );
  }

  const handleGuess = () => {
    if (selected) getSocket().emit("guess_witness", lobby.id, selected);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-red-400">You were caught!</h2>
          <p className="text-zinc-400">You have one last chance. Who was the witness?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lobby.players.filter(p => p.id !== player.id).map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selected === p.id
                  ? "bg-red-900/30 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="font-medium text-lg">{p.name}</div>
            </button>
          ))}
        </div>
        <button
          onClick={handleGuess}
          disabled={!selected}
          className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-xl px-4 py-4 transition-colors text-lg"
        >
          Guess Witness
        </button>
      </div>
    </div>
  );
}

function GameOverView({ lobby, player }: { lobby: Lobby; player: Player }) {
  const killer = lobby.players.find(p => p.role === "killer");
  const witness = lobby.players.find(p => p.role === "witness");
  const isKillerWin = lobby.winner === "killer";
  const bgColor = isKillerWin ? "bg-red-950" : "bg-emerald-950";
  const textColor = isKillerWin ? "text-red-400" : "text-emerald-400";

  return (
    <div className={`min-h-screen ${bgColor} text-zinc-100 flex items-center justify-center p-4 font-sans transition-colors duration-1000`}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-zinc-900/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-zinc-800/50 text-center"
      >
        <h1 className={`text-5xl font-black uppercase tracking-widest mb-2 ${textColor}`}>
          {isKillerWin ? "Killer Wins" : "Investigators Win"}
        </h1>
        <div className="my-8 space-y-4">
          <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
            <div className="text-sm text-zinc-500 uppercase tracking-wider mb-1">The Killer Was</div>
            <div className="text-xl font-bold text-red-400">{killer?.name}</div>
          </div>
          {witness && (
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
              <div className="text-sm text-zinc-500 uppercase tracking-wider mb-1">The Witness Was</div>
              <div className="text-xl font-bold text-blue-400">{witness.name}</div>
            </div>
          )}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-bold rounded-xl px-4 py-4 transition-colors text-lg"
        >
          Play Again
        </button>
      </motion.div>
    </div>
  );
}
