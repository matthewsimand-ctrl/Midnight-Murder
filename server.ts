import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const PORT = process.env.PORT || 10000;

// Game State
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

const lobbies: Record<string, Lobby> = {};

const HANDEDNESS = ["Left", "Right"];
const HAIR_COLORS = ["Black", "Brown", "Blonde", "Red", "Gray"];
const SHOE_TYPES = ["Boots", "Running Shoes", "Flip Flops", "Loafers", "Sneakers", "High Heels"];
const TSHIRT_DESIGNS = ["Plain", "Striped", "Polka Dot", "Graphic", "Tie-Dye", "Plaid", "Camo", "Floral", "Abstract", "Geometric"];
const OCCUPATIONS = ["Teacher", "Doctor", "Engineer", "Artist", "Chef", "Police", "Firefighter", "Musician", "Writer", "Actor", "Scientist", "Athlete", "Pilot", "Lawyer", "Farmer"];
const ACCESSORIES = ["Glasses", "Hat", "Watch", "Necklace", "Earrings", "None"];
const PLAYER_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b", "#84cc16"];

const CLUE_MAP: Record<string, string[]> = {
  "Left": ["Southpaw", "Sinister", "Scissors"],
  "Right": ["Standard", "Dexterous", "Common"],
  "Black": ["Midnight", "Raven", "Darkness"],
  "Brown": ["Earth", "Chestnut", "Chocolate"],
  "Blonde": ["Golden", "Sunlight", "Straw"],
  "Red": ["Fire", "Crimson", "Ginger"],
  "Gray": ["Silver", "Wisdom", "Ash"],
  "Boots": ["Winter", "Heavy", "Mud"],
  "Running Shoes": ["Athletic", "Laces", "Track"],
  "Flip Flops": ["Summer", "Beach", "Toes"],
  "Loafers": ["Casual", "Slip-on", "Leather"],
  "Sneakers": ["Street", "Comfort", "Rubber"],
  "High Heels": ["Formal", "Tall", "Click-clack"],
  "Plain": ["Simple", "Basic", "Unadorned"],
  "Striped": ["Lines", "Zebra", "Parallel"],
  "Polka Dot": ["Spots", "Circles", "Retro"],
  "Graphic": ["Picture", "Logo", "Print"],
  "Tie-Dye": ["Colorful", "Hippie", "Swirl"],
  "Plaid": ["Lumberjack", "Squares", "Flannel"],
  "Camo": ["Hidden", "Military", "Forest"],
  "Floral": ["Nature", "Garden", "Blossom"],
  "Abstract": ["Artistic", "Confusing", "Shapes"],
  "Geometric": ["Math", "Angles", "Sharp"],
  "Teacher": ["Chalk", "Grades", "School"],
  "Doctor": ["Stethoscope", "Medicine", "Hospital"],
  "Engineer": ["Math", "Build", "Design"],
  "Artist": ["Paint", "Canvas", "Creative"],
  "Chef": ["Kitchen", "Food", "Knife"],
  "Police": ["Badge", "Law", "Siren"],
  "Firefighter": ["Hose", "Rescue", "Flames"],
  "Musician": ["Notes", "Instrument", "Stage"],
  "Writer": ["Pen", "Paper", "Words"],
  "Actor": ["Stage", "Drama", "Camera"],
  "Scientist": ["Lab", "Microscope", "Research"],
  "Athlete": ["Sweat", "Sports", "Medal"],
  "Pilot": ["Sky", "Airplane", "Clouds"],
  "Lawyer": ["Court", "Suit", "Judge"],
  "Farmer": ["Tractor", "Crops", "Dirt"],
  "Glasses": ["Vision", "Lenses", "Frames"],
  "Hat": ["Headwear", "Shade", "Cap"],
  "Watch": ["Time", "Wrist", "Tick"],
  "Necklace": ["Jewelry", "Chain", "Pendant"],
  "Earrings": ["Piercing", "Lobes", "Studs"],
  "None": ["Bare", "Minimalist", "Empty"],
};

function getHeightClue(heightStr: string): string {
  const feet = parseInt(heightStr.split("'")[0]);
  if (feet < 5) return "Short";
  if (feet === 5) return "Average";
  if (feet > 5) return "Tall";
  return "Unknown";
}

function generateAttributes() {
  const heightInches = Math.floor(Math.random() * 37) + 48;
  const feet = Math.floor(heightInches / 12);
  const inches = heightInches % 12;

  return {
    handedness: HANDEDNESS[Math.floor(Math.random() * HANDEDNESS.length)],
    hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
    shoeType: SHOE_TYPES[Math.floor(Math.random() * SHOE_TYPES.length)],
    tshirtDesign: TSHIRT_DESIGNS[Math.floor(Math.random() * TSHIRT_DESIGNS.length)],
    occupation: OCCUPATIONS[Math.floor(Math.random() * OCCUPATIONS.length)],
    height: `${feet}'${inches}"`,
    accessory: ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)],
  };
}

function assignRoles(players: Player[]) {
  const roles: Role[] = ["killer", "witness", "investigator"];
  if (players.length >= 4) roles.push("forensics");
  while (roles.length < players.length) {
    roles.push("investigator");
  }

  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  players.forEach((p, i) => {
    p.role = roles[i];
  });
}

function generateTasks(): GameTask[] {
  const tasks: GameTask[] = [];
  const types: TaskType[] = ["word_fuse", "wordle", "backwards_feud", "taxi_jam"];

  for (let i = 0; i < 15; i++) {
    tasks.push({
      id: uuidv4(),
      x: Math.floor(Math.random() * 1600) + 200,
      y: Math.floor(Math.random() * 1600) + 200,
      type: types[Math.floor(Math.random() * types.length)],
      completed: false,
      lockedFor: []
    });
  }
  return tasks;
}

function generateClue(lobby: Lobby, isTampered: boolean): string {
  let targetPlayer: Player;
  if (isTampered) {
    const nonKillers = lobby.players.filter(p => p.role !== "killer");
    targetPlayer = nonKillers[Math.floor(Math.random() * nonKillers.length)] || lobby.players[0];
  } else {
    targetPlayer = lobby.players.find(p => p.role === "killer") || lobby.players[0];
  }

  const attrs = Object.keys(targetPlayer.attributes) as Array<keyof typeof targetPlayer.attributes>;
  const randomAttr = attrs[Math.floor(Math.random() * attrs.length)];
  const val = targetPlayer.attributes[randomAttr];

  if (randomAttr === "height") {
    return getHeightClue(val);
  }

  const possibleClues = CLUE_MAP[val];
  if (possibleClues && possibleClues.length > 0) {
    return possibleClues[Math.floor(Math.random() * possibleClues.length)];
  }

  return val;
}

io.on("connection", (socket) => {
  socket.on("create_lobby", (name: string, callback) => {
    const lobbyId = Math.random().toString(36).substring(2, 8).toUpperCase();
    lobbies[lobbyId] = {
      id: lobbyId,
      status: "lobby",
      players: [{
        id: socket.id,
        name,
        role: null,
        attributes: generateAttributes(),
        isHost: true,
        votedFor: null,
        x: 1000,
        y: 1000,
        color: PLAYER_COLORS[0],
        hasStolenClue: false
      }],
      clues: [],
      tasks: [],
      startTime: null,
      endTime: null,
      winner: null
    };
    socket.join(lobbyId);
    callback({ lobbyId, playerId: socket.id });
    io.to(lobbyId).emit("lobby_update", lobbies[lobbyId]);
  });

  socket.on("join_lobby", (lobbyId: string, name: string, callback) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) {
      return callback({ error: "Lobby not found" });
    }
    if (lobby.status !== "lobby") {
      return callback({ error: "Game already in progress" });
    }

    let finalName = name;
    let counter = 1;
    while (lobby.players.some(p => p.name === finalName)) {
      finalName = `${name} ${counter}`;
      counter++;
    }

    lobby.players.push({
      id: socket.id,
      name: finalName,
      role: null,
      attributes: generateAttributes(),
      isHost: false,
      votedFor: null,
      x: 1000 + Math.random() * 100 - 50,
      y: 1000 + Math.random() * 100 - 50,
      color: PLAYER_COLORS[lobby.players.length % PLAYER_COLORS.length],
      hasStolenClue: false
    });
    socket.join(lobbyId);
    callback({ lobbyId, playerId: socket.id });
    io.to(lobbyId).emit("lobby_update", lobby);
  });

  socket.on("leave_lobby", (lobbyId: string) => {
    const lobby = lobbies[lobbyId];
    if (lobby) {
      const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        lobby.players.splice(playerIndex, 1);
        socket.leave(lobbyId);
        socket.emit("left_lobby");
        if (lobby.players.length === 0) {
          delete lobbies[lobbyId];
        } else {
          if (lobby.status === "lobby") {
            lobby.players[0].isHost = true;
          }
          io.to(lobbyId).emit("lobby_update", lobby);
        }
      }
    }
  });

  socket.on("start_game", (lobbyId: string) => {
    const lobby = lobbies[lobbyId];
    if (lobby && lobby.players.find(p => p.id === socket.id)?.isHost) {
      if (lobby.players.length < 3) {
        return;
      }
      assignRoles(lobby.players);
      lobby.tasks = generateTasks();
      lobby.status = "playing";
      lobby.startTime = Date.now();
      lobby.endTime = Date.now() + 5 * 60 * 1000;
      io.to(lobbyId).emit("game_started", lobby);

      setTimeout(() => {
        if (lobbies[lobbyId] && lobbies[lobbyId].status === "playing") {
          lobbies[lobbyId].status = "discussion";
          io.to(lobbyId).emit("lobby_update", lobbies[lobbyId]);
        }
      }, 5 * 60 * 1000);
    }
  });

  socket.on("move", (lobbyId: string, x: number, y: number) => {
    const lobby = lobbies[lobbyId];
    if (lobby && lobby.status === "playing") {
      const player = lobby.players.find(p => p.id === socket.id);
      if (player) {
        player.x = x;
        player.y = y;
        socket.to(lobbyId).volatile.emit("player_moved", { id: socket.id, x, y });
      }
    }
  });

  socket.on("task_completed", (lobbyId: string, taskId: string) => {
    const lobby = lobbies[lobbyId];
    if (lobby && lobby.status === "playing") {
      const task = lobby.tasks.find(t => t.id === taskId);
      if (task && !task.completed) {
        task.completed = true;

        const player = lobby.players.find(p => p.id === socket.id);
        if (player) {
          const isTampered = player.role === "killer";
          const clueText = generateClue(lobby, isTampered);
          lobby.clues.push({
            id: uuidv4(),
            text: clueText,
            isTampered,
            foundBy: player.id
          });
          io.to(lobbyId).emit("task_update", lobby.tasks);
          io.to(lobbyId).emit("clue_found", lobby.clues);
        }
      }
    }
  });

  socket.on("lock_task", (lobbyId: string, taskId: string) => {
    const lobby = lobbies[lobbyId];
    if (lobby && lobby.status === "playing") {
      const task = lobby.tasks.find(t => t.id === taskId);
      if (task && !task.lockedFor.includes(socket.id)) {
        task.lockedFor.push(socket.id);
        io.to(lobbyId).emit("task_update", lobby.tasks);
      }
    }
  });

  // Killer steal/tamper ability
  socket.on("steal_clue", (lobbyId: string, targetPlayerId: string, callback) => {
    const lobby = lobbies[lobbyId];
    if (!lobby || lobby.status !== "playing") return callback({ error: "Game not active" });

    const thief = lobby.players.find(p => p.id === socket.id);
    if (!thief || thief.role !== "killer") return callback({ error: "Only the killer can do this" });
    if (thief.hasStolenClue) return callback({ error: "Already used steal ability" });

    const target = lobby.players.find(p => p.id === targetPlayerId);
    if (!target) return callback({ error: "Target not found" });

    const targetClues = lobby.clues.filter(c => c.foundBy === targetPlayerId && !c.isTampered);

    if (targetClues.length > 0) {
      // Tamper an existing real clue found by target
      const clue = targetClues[Math.floor(Math.random() * targetClues.length)];
      clue.isTampered = true;
      thief.hasStolenClue = true;
      io.to(lobbyId).emit("clue_found", lobby.clues);
      io.to(lobbyId).emit("lobby_update", lobby);
      callback({ message: `Clue from ${target.name} tampered!` });
    } else {
      // Plant a fake clue attributed to target
      const fakeClueText = generateClue(lobby, true);
      lobby.clues.push({
        id: uuidv4(),
        text: fakeClueText,
        isTampered: true,
        foundBy: targetPlayerId
      });
      thief.hasStolenClue = true;
      io.to(lobbyId).emit("clue_found", lobby.clues);
      io.to(lobbyId).emit("lobby_update", lobby);
      callback({ message: `Fake clue planted on ${target.name}!` });
    }
  });

  socket.on("vote", (lobbyId: string, targetPlayerId: string) => {
    const lobby = lobbies[lobbyId];
    if (lobby && lobby.status === "voting") {
      const player = lobby.players.find(p => p.id === socket.id);
      if (player) {
        player.votedFor = targetPlayerId;
        io.to(lobbyId).emit("lobby_update", lobby);

        if (lobby.players.every(p => p.votedFor)) {
          const votes: Record<string, number> = {};
          lobby.players.forEach(p => {
            if (p.votedFor) {
              votes[p.votedFor] = (votes[p.votedFor] || 0) + 1;
            }
          });

          let maxVotes = 0;
          let suspectedId: string | null = null;
          let tie = false;

          for (const [id, count] of Object.entries(votes)) {
            if (count > maxVotes) {
              maxVotes = count;
              suspectedId = id;
              tie = false;
            } else if (count === maxVotes) {
              tie = true;
            }
          }

          const killer = lobby.players.find(p => p.role === "killer");

          if (tie || suspectedId !== killer?.id) {
            lobby.winner = "killer";
            lobby.status = "game_over";
          } else {
            lobby.status = "witness_guessing";
          }
          io.to(lobbyId).emit("lobby_update", lobby);
        }
      }
    }
  });

  socket.on("guess_witness", (lobbyId: string, targetPlayerId: string) => {
    const lobby = lobbies[lobbyId];
    if (lobby && lobby.status === "witness_guessing") {
      const player = lobby.players.find(p => p.id === socket.id);
      if (player && player.role === "killer") {
        const target = lobby.players.find(p => p.id === targetPlayerId);
        if (target?.role === "witness") {
          lobby.winner = "killer";
        } else {
          lobby.winner = "investigators";
        }
        lobby.status = "game_over";
        io.to(lobbyId).emit("lobby_update", lobby);
      }
    }
  });

  socket.on("start_voting", (lobbyId: string) => {
    const lobby = lobbies[lobbyId];
    if (lobby && lobby.status === "discussion") {
      const player = lobby.players.find(p => p.id === socket.id);
      if (player?.isHost) {
        lobby.status = "voting";
        io.to(lobbyId).emit("lobby_update", lobby);
      }
    }
  });

  socket.on("disconnect", () => {
    for (const lobbyId in lobbies) {
      const lobby = lobbies[lobbyId];
      const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        if (lobby.status === "lobby") {
          lobby.players.splice(playerIndex, 1);
          if (lobby.players.length === 0) {
            delete lobbies[lobbyId];
          } else {
            lobby.players[0].isHost = true;
            io.to(lobbyId).emit("lobby_update", lobby);
          }
        }
      }
    }
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

sync function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // 2. Use path.join and __dirname to be 100% explicit
    const distPath = path.join(process.cwd(), "dist");
    
    app.use(express.static(distPath));

    // 3. This catch-all route MUST come AFTER express.static
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
