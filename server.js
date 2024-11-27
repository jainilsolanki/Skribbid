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
  room.word = getRandomWord();
  room.timeLeft = 60;
  room.currentDrawer = room.players[(room.currentDrawerIndex + 1) % room.players.length].id;
  room.currentDrawerIndex = (room.currentDrawerIndex + 1) % room.players.length;
  room.roundActive = true;

  // Clear canvas for all players at the start of a new round
  io.to(roomId).emit('clear_canvas');

  io.to(roomId).emit('round_started', {
    drawer: room.currentDrawer,
    timeLeft: room.timeLeft
  });

  io.to(room.currentDrawer).emit('word_to_draw', room.word);

  room.timerInterval = setInterval(() => {
    room.timeLeft--;
    io.to(roomId).emit('timer_update', room.timeLeft);

    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval);
      endRound(roomId);
    }
  }, 1000);
}

function endRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  clearInterval(room.timerInterval);
  room.roundActive = false;

  // Clear canvas for all players at the end of the round
  io.to(roomId).emit('clear_canvas');

  const nextDrawer = room.players[(room.currentDrawerIndex + 1) % room.players.length].id;
  io.to(roomId).emit('round_ended', {
    word: room.word,
    scores: room.scores,
    nextDrawer: nextDrawer
  });

  setTimeout(() => {
    if (rooms.has(roomId)) {
      startNewRound(roomId);
    }
  }, 3000);
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
      timerInterval: null
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

    startNewRound(roomId);
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
        timeLeft: room.timeLeft
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

  socket.on('disconnecting', () => {
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        delete room.scores[socket.id];

        if (room.players.length === 0) {
          clearInterval(room.timerInterval);
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
