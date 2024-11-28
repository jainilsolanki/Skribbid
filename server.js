import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"]
  }
});

const words = [
  'apple', 'banana', 'cat', 'dog', 'elephant',
  'flower', 'guitar', 'house', 'ice cream', 'jellyfish',
  'kangaroo', 'lion', 'monkey', 'notebook', 'orange',
  'penguin', 'queen', 'rainbow', 'sun', 'tree',
  'umbrella', 'violin', 'whale', 'xylophone', 'zebra'
];

const rooms = new Map();

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

function startNewRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  clearInterval(room.timerInterval);
  clearInterval(room.hintInterval);  // Clear any existing hint interval
  room.word = getRandomWord();
  room.timeLeft = room.settings.roundTime;
  room.currentDrawer = room.players[(room.currentDrawerIndex + 1) % room.players.length].id;
  room.currentDrawerIndex = (room.currentDrawerIndex + 1) % room.players.length;
  room.roundActive = true;
  room.currentRound = (room.currentRound || 0) + 1;
  room.revealedIndices = new Set();  // Track revealed letter indices

  // First clear the canvas
  io.to(roomId).emit('clear_canvas');

  // Then start the new round
  setTimeout(() => {
    io.to(roomId).emit('round_started', {
      drawer: room.currentDrawer,
      timeLeft: room.timeLeft,
      roundNumber: room.currentRound
    });

    // Send word to everyone
    io.to(roomId).emit('word_to_draw', {
      word: room.word,
      isDrawer: false,
      revealedIndices: Array.from(room.revealedIndices)
    });

    // Send special message to drawer
    io.to(room.currentDrawer).emit('word_to_draw', {
      word: room.word,
      isDrawer: true,
      revealedIndices: Array.from(room.revealedIndices)
    });

    // Set up hint interval (every 30 seconds)
    room.hintInterval = setInterval(() => {
      const wordWithoutSpaces = room.word.replace(/\s/g, '');
      const maxReveals = Math.ceil(wordWithoutSpaces.length * 0.25); // Only reveal 25% of letters

      if (room.revealedIndices.size < maxReveals) {
        // Find a random unrevealed letter (excluding spaces)
        const availableIndices = [];
        let spaceCount = 0;
        
        for (let i = 0; i < room.word.length; i++) {
          if (room.word[i] === ' ') {
            spaceCount++;
            continue;
          }
          const adjustedIndex = i - spaceCount;
          if (!room.revealedIndices.has(adjustedIndex)) {
            availableIndices.push(adjustedIndex);
          }
        }

        if (availableIndices.length > 0) {
          const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
          room.revealedIndices.add(randomIndex);
          
          // Send updated revealed indices to all players
          io.to(roomId).emit('letter_revealed', {
            revealedIndices: Array.from(room.revealedIndices)
          });
        }
      }
    }, 30000); // 30 seconds

    room.timerInterval = setInterval(() => {
      room.timeLeft--;
      io.to(roomId).emit('timer_update', room.timeLeft);

      if (room.timeLeft <= 0) {
        clearInterval(room.timerInterval);
        clearInterval(room.hintInterval);
        endRound(roomId);
      }
    }, 1000);
  }, 500);
}

function endRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  clearInterval(room.timerInterval);
  clearInterval(room.hintInterval);
  room.roundActive = false;

  // First clear the canvas
  io.to(roomId).emit('clear_canvas');

  // Then end the round
  setTimeout(() => {
    const nextDrawer = room.players[(room.currentDrawerIndex + 1) % room.players.length].id;
    io.to(roomId).emit('round_ended', {
      word: room.word,
      scores: room.scores,
      nextDrawer: nextDrawer
    });

    // Check if game should end
    if (room.currentRound >= room.settings.maxRounds) {
      io.to(roomId).emit('game_ended', {
        finalPlayers: room.players.map(p => ({
          ...p,
          score: room.scores[p.id]
        }))
      });
      room.currentRound = 0;
      return;
    }

    // Start new round after a delay
    setTimeout(() => {
      if (rooms.has(roomId)) {
        startNewRound(roomId);
      }
    }, 3000);
  }, 500);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create_room', ({ username }) => {
    console.log('Creating room for user:', username);
    const roomId = generateRoomId();
    
    const room = {
      players: [{
        id: socket.id,
        username,
        isHost: true
      }],
      scores: { [socket.id]: 0 },
      currentDrawer: socket.id,
      currentDrawerIndex: 0,
      word: '',
      timeLeft: 60,
      roundActive: false,
      timerInterval: null,
      hintInterval: null,
      settings: {
        roundTime: 60,
        maxRounds: 5
      },
      currentRound: 0,
      revealedIndices: new Set()
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    
    console.log('Room created:', roomId);
    socket.emit('room_created', { roomId });
    io.to(roomId).emit('player_joined', {
      players: room.players,
      scores: room.scores,
      currentDrawer: room.currentDrawer
    });
  });

  socket.on('join_room', ({ roomId, username }) => {
    console.log('Join room request:', { roomId, username, socketId: socket.id });
    
    roomId = roomId.toUpperCase();
    const room = rooms.get(roomId);
    
    if (!room) {
      console.log('Room not found:', roomId);
      socket.emit('room_error', { message: 'Room not found' });
      return;
    }

    const existingPlayer = room.players.find(p => p.id === socket.id);
    if (existingPlayer) {
      console.log('Player already in room:', socket.id);
      socket.emit('room_error', { message: 'You are already in this room' });
      return;
    }

    console.log('Current room state:', {
      players: room.players,
      currentDrawer: room.currentDrawer,
      roundActive: room.roundActive
    });

    socket.join(roomId);
    console.log('Socket joined room:', roomId);
    
    const newPlayer = {
      id: socket.id,
      username,
      isHost: false
    };
    room.players.push(newPlayer);
    room.scores[socket.id] = 0;

    console.log('Updated room state:', {
      players: room.players,
      scores: room.scores,
      currentDrawer: room.currentDrawer
    });

    socket.emit('join_success', { roomId });

    io.to(roomId).emit('player_joined', {
      players: room.players,
      scores: room.scores,
      currentDrawer: room.currentDrawer
    });
    console.log('Emitted player_joined event');

    if (room.roundActive) {
      console.log('Sending current game state to new player');
      socket.emit('round_started', {
        drawer: room.currentDrawer,
        timeLeft: room.timeLeft,
        roundNumber: room.currentRound
      });
      socket.emit('word_to_draw', {
        word: room.word,
        isDrawer: false,
        revealedIndices: Array.from(room.revealedIndices)
      });
    }
  });

  socket.on('draw', ({ roomId, x, y, color, drawing }) => {
    console.log('Draw event received:', { roomId, x, y, color, drawing });
    const room = rooms.get(roomId);
    if (room && socket.id === room.currentDrawer) {
      socket.to(roomId).emit('draw', { x, y, color, drawing });
    }
  });

  socket.on('clear_canvas', ({ roomId }) => {
    console.log('Clear canvas event received:', roomId);
    const room = rooms.get(roomId);
    if (room && socket.id === room.currentDrawer) {
      socket.to(roomId).emit('clear_canvas');
    }
  });

  socket.on('guess', ({ roomId, guess }) => {
    console.log('Guess received:', { roomId, guess });
    const room = rooms.get(roomId);
    if (!room || !room.roundActive || socket.id === room.currentDrawer) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Broadcast the guess to all players in the room
    io.to(roomId).emit('chat_message', {
      player: player.username,
      message: guess
    });

    if (guess.toLowerCase() === room.word.toLowerCase()) {
      room.scores[socket.id] += 100;
      io.to(roomId).emit('correct_guess', {
        player: socket.id,
        scores: room.scores
      });
      
      const nonDrawerPlayers = room.players.filter(p => p.id !== room.currentDrawer);
      const allGuessedCorrectly = nonDrawerPlayers.every(p => room.scores[p.id] > 0);
      
      if (allGuessedCorrectly) {
        endRound(roomId);
      }
    }
  });

  socket.on('start_game', ({ roomId, settings }) => {
    console.log('Starting game:', { roomId, settings });
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) return;

    room.settings = settings;
    room.currentRound = 0;

    // Reset scores
    room.players.forEach(p => {
      room.scores[p.id] = 0;
    });

    io.to(roomId).emit('game_started', settings);
    startNewRound(roomId);
  });

  socket.on('play_again', ({ roomId }) => {
    console.log('Play again request:', roomId);
    const room = rooms.get(roomId);
    if (!room) return;

    // Reset scores and round counter
    room.players.forEach(p => {
      room.scores[p.id] = 0;
    });
    room.currentRound = 0;

    // Return to lobby state
    io.to(roomId).emit('player_joined', {
      players: room.players,
      scores: room.scores,
      currentDrawer: room.currentDrawer
    });
  });

  socket.on('disconnecting', () => {
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        delete room.scores[socket.id];

        if (room.players.length === 0) {
          clearInterval(room.timerInterval);
          clearInterval(room.hintInterval);
          rooms.delete(roomId);
        } else {
          if (socket.id === room.currentDrawer) {
            endRound(roomId);
          }
          io.to(roomId).emit('player_left', {
            players: room.players,
            scores: room.scores,
            currentDrawer: room.currentDrawer
          });
        }
      }
    }
  });
});

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
