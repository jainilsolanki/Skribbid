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
  // Animals
  'elephant', 'giraffe', 'penguin', 'dolphin', 'kangaroo', 'octopus', 'butterfly', 'rhinoceros', 'squirrel', 'hamster',
  'panda', 'koala', 'cheetah', 'zebra', 'gorilla', 'hedgehog', 'platypus', 'flamingo', 'raccoon', 'armadillo',
  
  // Food & Drinks
  'pizza', 'hamburger', 'spaghetti', 'chocolate', 'ice cream', 'pancake', 'sandwich', 'popcorn', 'taco', 'sushi',
  'coffee', 'milkshake', 'cupcake', 'cookie', 'donut', 'burrito', 'lasagna', 'croissant', 'smoothie', 'waffle',
  
  // Objects
  'umbrella', 'telescope', 'backpack', 'calculator', 'headphones', 'keyboard', 'microphone', 'sunglasses', 'toothbrush', 'wallet',
  'camera', 'compass', 'laptop', 'paintbrush', 'scissors', 'telescope', 'watch', 'binoculars', 'microscope', 'thermometer',
  
  // Sports & Games
  'basketball', 'volleyball', 'skateboard', 'football', 'baseball', 'tennis', 'bowling', 'chess', 'darts', 'golf',
  'hockey', 'rugby', 'surfing', 'swimming', 'boxing', 'karate', 'archery', 'billiards', 'cricket', 'frisbee',
  
  // Nature
  'mountain', 'waterfall', 'rainbow', 'volcano', 'tornado', 'island', 'desert', 'forest', 'beach', 'glacier',
  'canyon', 'ocean', 'river', 'sunset', 'sunrise', 'moonlight', 'hurricane', 'avalanche', 'earthquake', 'lightning',
  
  // Transportation
  'airplane', 'helicopter', 'submarine', 'motorcycle', 'bicycle', 'spaceship', 'sailboat', 'train', 'tractor', 'ambulance',
  'firetruck', 'scooter', 'skateboard', 'rollerblades', 'jetski', 'bulldozer', 'rocket', 'trolley', 'limousine', 'taxi',
  
  // Professions
  'astronaut', 'firefighter', 'scientist', 'detective', 'musician', 'magician', 'architect', 'chef', 'pilot', 'teacher',
  'doctor', 'artist', 'photographer', 'programmer', 'veterinarian', 'archaeologist', 'dentist', 'electrician', 'plumber', 'carpenter',
  
  // Entertainment
  'guitar', 'piano', 'trumpet', 'violin', 'drums', 'microphone', 'television', 'cinema', 'theatre', 'concert',
  'circus', 'carnival', 'rollercoaster', 'ferriswheel', 'carousel', 'puppet', 'juggler', 'acrobat', 'magician', 'comedian'
];

// Function to fetch a random word from DataMuse API
async function fetchRandomWord() {
  try {
    // Get common words that are:
    // - Nouns (tagged as 'n')
    // - Frequently used (using frequency count 'f')
    // - 3-16 letters long (using multiple patterns)
    const patterns = ['???', '????', '?????', '??????', '???????', '????????', '?????????', '??????????', '???????????', '????????????', '?????????????', '??????????????', '???????????????', '????????????????'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    const response = await fetch(`https://api.datamuse.com/words?sp=${pattern}&max=100&md=pf&tags=n`);
    const words = await response.json();
    
    // Filter for simple, common words
    const validWords = words.filter(wordObj => {
      const word = wordObj.word.toLowerCase();
      // Check if it's a common word (frequency > 1000)
      const isCommon = wordObj.tags && wordObj.tags.includes('n') && wordObj.f > 1000;
      
      return (
        word.length >= 3 && 
        word.length <= 16 &&
        /^[a-z]+$/.test(word) &&
        !word.includes('-') &&
        !word.includes('_') &&
        isCommon
      );
    });

    if (validWords.length > 0) {
      // Sort by frequency and take top 20 most common words
      validWords.sort((a, b) => (b.f || 0) - (a.f || 0));
      const topWords = validWords.slice(0, 20);
      // Return a random word from top common words
      return topWords[Math.floor(Math.random() * topWords.length)].word;
    }
    
    throw new Error('No valid words found');
  } catch (error) {
    console.error('Error fetching from DataMuse API:', error);
    return getRandomLocalWord();
  }
}

// Get word from local list
function getRandomLocalWord() {
  return words[Math.floor(Math.random() * words.length)];
}

// Main function to get a random word
async function getRandomWord() {
  try {
    // 70% chance to use API, 30% chance to use local words
    if (Math.random() < 1) {
      const word = await fetchRandomWord();
      return word;
    }
    return getRandomLocalWord();
  } catch (error) {
    console.error('API failed, using local word:', error);
    return getRandomLocalWord();
  }
}

// Calculate similarity between two words
function calculateSimilarity(str1, str2) {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  return (Math.max(str1.length, str2.length) - track[str2.length][str1.length]) / Math.max(str1.length, str2.length);
}

const rooms = new Map();

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function startNewRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  clearInterval(room.timerInterval);
  clearInterval(room.hintInterval);  // Clear any existing hint interval
  
  try {
    room.word = await getRandomWord();
  } catch (error) {
    console.error('Error getting word, using fallback:', error);
    room.word = getRandomLocalWord();
  }

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

    const cleanGuess = guess.toLowerCase().trim();
    const cleanWord = room.word.toLowerCase().trim();
    
    console.log('Comparing:', { cleanGuess, cleanWord });

    // Check for exact match
    if (cleanGuess === cleanWord) {
      const points = Math.ceil((room.timeLeft / room.settings.roundTime) * 500);
      room.scores[socket.id] = (room.scores[socket.id] || 0) + points;
      
      // Broadcast the guess and correct guess events
      io.to(roomId).emit('chat_message', {
        player: player.username,
        message: guess,
        type: 'guess'
      });
      
      io.to(roomId).emit('correct_guess', {
        player: socket.id,
        scores: room.scores
      });

      // Check if everyone has guessed correctly
      const nonDrawerPlayers = room.players.filter(p => p.id !== room.currentDrawer);
      const allGuessedCorrectly = nonDrawerPlayers.every(p => room.scores[p.id] > 0);
      
      if (allGuessedCorrectly) {
        endRound(roomId);
      }
    } else {
      // Check for similar words
      const similarity = calculateSimilarity(cleanGuess, cleanWord);
      console.log('Similarity:', similarity);

      // Broadcast the guess
      io.to(roomId).emit('chat_message', {
        player: player.username,
        message: guess,
        type: 'guess'
      });

      // Send "close" messages only to the guesser
      if (similarity >= 0.75) {
        socket.emit('chat_message', {
          player: 'System',
          message: 'You are very close!',
          type: 'system'
        });
      } else if (similarity >= 0.6) {
        socket.emit('chat_message', {
          player: 'System',
          message: 'You are close!',
          type: 'system'
        });
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
